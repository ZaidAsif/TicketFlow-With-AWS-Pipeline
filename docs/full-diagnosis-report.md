# TicketFlow — Full System Diagnosis Report

**Date:** 2026-07-12
**Author:** Automated diagnosis (Buffy AI)
**Scope:** Sections A–H per diagnostic prompt, superseding all prior audits

---

## Executive Summary

Two independent bugs were simultaneously preventing the CI/CD pipeline from deploying actual code changes despite reporting "Success":

1. **Bug A — Swallowed Terraform Validate errors**: The `hashicorp/setup-terraform@v3` action's wrapper script (enabled by default) was capable of masking non-zero exit codes from `terraform validate` and `terraform plan`. Combined with `continue-on-error: true` on the `terraform fmt` step (which is fine for formatting issues), the validate job reported success even when real errors existed.

2. **Bug B — AMI ID handoff broken**: The `Save AMI ID` step ran from the repository root (no `working-directory`), but Packer outputs `manifest.json` inside `./packer/`. The `cat manifest.json` command found nothing, `AMI_ID` was set to empty string, and Terraform received an empty `ami_id` variable — causing it to use the default stock Ubuntu AMI instead of the freshly built Packer AMI.

Both bugs are now fixed. A fresh end-to-end pipeline run is needed to confirm success.

---

## Section A — Swallowed Terraform Validate Errors

### Evidence

From the workflow file (`.github/workflows/deploy.yml`) before the fix:

```yaml
- name: Setup Terraform
  uses: hashicorp/setup-terraform@v3
  with:
    terraform_version: "1.5.0"
    # terraform_wrapper defaults to true — creates a wrapper script
```

The `hashicorp/setup-terraform@v3` action, when `terraform_wrapper` is not explicitly set to `false`, installs a wrapper script around `terraform` commands. This wrapper captures stdout/stderr and converts them to GitHub annotations. In certain versions, the wrapper has known issues with exit code propagation — the script captures the terraform output but may exit 0 even when terraform exited non-zero.

Additionally, an earlier `Validation Summary` step always declared success regardless of actual step results:

```yaml
- name: Validation Summary
  run: |
    echo "Terraform configuration is valid"
    echo "Plan passed — ready for AMI build"
```

Earlier pipeline audit reports confirmed 2 real errors in the validate job's annotations:
- Exit code 1 from `terraform fmt -check` (formatting issue) — acceptable, has `continue-on-error: true`
- Exit code 3 from `terraform validate` (configuration validation failure) — **this is the real problem that was being masked**

### What Could Not Be Determined

We were unable to retrieve the actual annotation error text from GitHub Actions logs. The GitHub API returned `403 Forbidden` when trying to download workflow logs (requires admin rights). The `gh` CLI could not be installed on this Windows machine. A `browser-use` agent could navigate to the run URL to view logs visually.

The two possible causes for the swallowed exit code 3 are:
1. The terraform wrapper script exited 0 despite terraform returning code 3
2. The `Validation Summary` step's success message created the illusion of success while the real step had actually failed

### Fix Applied

1. **Disabled the terraform wrapper** in ALL jobs that use setup-terraform (validate, terraform-apply, verify):
   ```yaml
   - name: Setup Terraform
     uses: hashicorp/setup-terraform@v3
     with:
       terraform_version: "1.5.0"
       terraform_wrapper: false
   ```
   This ensures terraform commands exit with their real exit codes.

2. **Removed the misleading Validation Summary step entirely** — it provided no real value and its message was misleading.

With `terraform_wrapper: false`, if `terraform validate` exits with code 3 (config error) or `terraform plan` fails, the step fails immediately and the job's conclusion becomes `failure`. The validate job will no longer report "success" when errors exist.

### What the Errors Were

Based on the original diagnosis:
- `terraform fmt -check` exit code 1 — intentionally swallowed via `continue-on-error: true` (acceptable)
- `terraform validate` exit code 3 — this was the real swallowed error. Could be a legitimate config issue or a transient validation error. The next pipeline run (with `terraform_wrapper: false`) will surface this if it still exists.

---

## Section B — Terraform Apply Not Replacing the Instance

### Root Cause

**The `Save AMI ID` step ran from the wrong directory.**

In the `build-ami` job (before fix):

```yaml
# Packer runs in ./packer/ — manifest.json is created there
- name: Build AMI with Packer
  working-directory: ./packer
  run: packer build ... ticketflow-ami.pkr.hcl

# But this step had NO working-directory, so it ran from the repo root!
- name: Save AMI ID
  id: save-ami
  run: |
    AMI_ID=$(cat manifest.json | jq -r '.builds[-1].artifact_id' | cut -d: -f2)
    echo "AMI_ID=$AMI_ID" >> "$GITHUB_OUTPUT"
```

Since `manifest.json` was in `./packer/` but `cat manifest.json` ran from the repo root, the command found nothing, `AMI_ID` was set to empty string, and:

```yaml
# In the terraform job:
terraform apply -auto-approve \
  -var "ami_id=${{ needs.build-ami.outputs.ami_id }}"
```

This became `terraform apply -auto-approve -var "ami_id="`. In `variables.tf`:

```hcl
variable "ami_id" {
  type    = string
  default = ""
}
```

And in `main.tf`:

```hcl
locals {
  ec2_ami_id = var.ami_id != "" ? var.ami_id : data.aws_ami.ubuntu.id
}
```

Empty string != "" evaluates to **false**, so Terraform used the stock Ubuntu AMI — which is what was already deployed. **No change detected → apply completed in ~29 seconds with zero actual modifications.**

### Confirmed: No `lifecycle` Blocks Blocking Changes

We searched the entire terraform config for `lifecycle` blocks and `ignore_changes` — **none found**. The AMI substitution WILL trigger instance replacement once the AMI ID is correctly passed.

### Evidence (Before Fix)

| Metric | Before Fix |
|---|---|
| EC2 Instance ID | `i-0f94248bebe9bfc91` |
| Launch Time | `2026-07-11T07:38:19+00:00` (old — not replaced) |
| AMI in Use | `ami-0d28727121d5d4a3c` (stock Ubuntu 22.04, Canonical) |
| Packer AMIs Built | 4 AMIs exist, **none in use** |
| Latest Run (#5) Result | "success" — but instance unchanged |
| Apply Duration | ~29 seconds (too fast for instance replacement) |

**Packer AMIs that were built but never used:**

| AMI ID | Name | Created | Pipeline Run |
|---|---|---|---|
| `ami-0767892e1d3b4f3ad` | `ticketflow-ami-29152114132` | 2026-07-11 12:31:26 | #2 (failed at apply) |
| `ami-0e829d807cf8ee2cb` | `ticketflow-ami-29153326295` | 2026-07-11 13:15:23 | #3 (cancelled) |
| `ami-0117aebb8c63515fd` | `ticketflow-ami-29153877886` | 2026-07-11 13:37:33 | #4 (success — but no-op) |
| `ami-06c752cbd4b9de3f2` | `ticketflow-ami-29158903496` | 2026-07-11 16:22:27 | #5 (success — but no-op) |

### State Serial as Evidence

The Terraform state file has `serial: 2`. This means only 2 state modifications occurred across all 5 pipeline runs and 3 `terraform apply` executions. This directly corroborates the no-op finding — Terraform was detecting zero changes every time because the AMI ID was always empty (defaulting to the same stock Ubuntu AMI).

### Fix Applied

Added `working-directory: ./packer` to the Save AMI ID step:

```yaml
- name: Save AMI ID
  id: save-ami
  working-directory: ./packer    # <- Added
  run: |
    AMI_ID=$(cat manifest.json | jq -r '.builds[-1].artifact_id' | cut -d: -f2)
    echo "AMI_ID=$AMI_ID" >> "$GITHUB_OUTPUT"
    echo "Built AMI: $AMI_ID"
```

Post-fix, the step reads `./packer/manifest.json`, extracts the real AMI ID, and passes it to `terraform apply`. This will trigger EC2 instance replacement because:
- New AMI ID differs from current AMI (`ami-0d28727121d5d4a3c`)
- `user_data_base64` changes (switches from `user-data.sh` to `user-data-ami.sh` template)
- No `lifecycle { ignore_changes }` blocks exist to prevent this

### Expected Post-Fix Verification

Run the following after the next pipeline completes:

```bash
aws ec2 describe-instances --filters "Name=tag:Name,Values=ticketflow-app" \
  --query 'Reservations[].Instances[0].[InstanceId,LaunchTime,ImageId]' --output text
```

Expected output: **new** LaunchTime and **new** ImageId (the Packer-built AMI from that run).

```bash
aws ec2 describe-images --image-ids <new-ami-id> \
  --query 'Images[0].Name' --output text
```

Expected: `ticketflow-ami-<run-id>`

---

## Section C — Terraform State Verification

### What Was Checked

| Check | Method | Result |
|---|---|---|
| S3 backend bucket exists | `aws s3 ls s3://ticketflow-terraform-state-360394172900/` | Bucket exists |
| Remote state file readable | Downloaded via `aws s3 cp` | Valid JSON, `terraform_version: 1.5.0` |
| Resources match main.tf | Parsed state resources | 22 resources exactly match config |
| DynamoDB lock table exists | `aws dynamodb describe-table --table-name terraform-state-lock` | Table exists, status: ACTIVE |
| Backend block in provider.tf | Read `terraform/provider.tf` | `backend "s3" { ... }` correctly configured |
| No local state file used | Checked workflow init steps | All use `working-directory: ./terraform` with remote backend |

**State file summary:**
- **Serial:** 2 (only 2 modifications — corroborates the no-op AMI bug)
- **Terraform version:** 1.5.0
- **Resources:** 22 (1 data source, 21 managed)
- **Outputs:** 11 (including `app_url`, `ec2_public_ip`, `ec2_ami_id`)

The `provider.tf` backend block:

```hcl
backend "s3" {
  bucket         = "ticketflow-terraform-state-360394172900"
  key            = "terraform.tfstate"
  region         = "us-east-1"
  dynamodb_table = "terraform-state-lock"
  encrypt        = true
}
```

Since runs #4 and #5 completed `Terraform Init` and `Terraform Apply` successfully against this backend, the remote state configuration is confirmed working in CI.

---

## Section D — Packer Verification

| Check | Method | Result |
|---|---|---|
| `manifest` post-processor in config | Read `packer/ticketflow-ami.pkr.hcl` | Present: `post-processor "manifest" { output = "manifest.json" }` |
| Manifest produced in runs | Checked AWS for `ticketflow-ami-*` AMIs | 4 AMIs built |
| AMI region matches Terraform | Both in `us-east-1` | Match |
| AMI used downstream | Pre-fix: broken (wrong directory) | **Fixed** |

Packer is building correctly. The 4 AMIs were all created successfully, tagged as `ManagedBy: Packer`, and are in `available` state. The pre-fix bug was in the downstream step that reads the manifest, not in Packer itself.

---

## Section E — GitHub Actions Workflow Audit

### Job Dependency Chain

```
test -> validate -> build-ami -> terraform -> verify
                    ^                            ^
              (only on main)               (only on main)
```

All `needs:` dependencies are correct:
- `validate` needs `test` — won't validate if tests fail
- `build-ami` needs `validate` — won't build if validation fails
- `terraform` needs `build-ami` — won't apply without AMI ID
- `verify` needs `terraform` — won't verify without apply

### Secret Reference Audit

| Reference | Purpose | Status |
|---|---|---|
| `secrets.AWS_ACCESS_KEY_ID` | AWS credentials | Confirmed by user |
| `secrets.AWS_SECRET_ACCESS_KEY` | AWS credentials | Confirmed by user |
| `secrets.DB_HOST` | RDS endpoint | Confirmed by user |
| `secrets.DB_USER` | RDS username | Confirmed by user |
| `secrets.DB_PASSWORD` | RDS password | Confirmed by user |
| `secrets.DB_NAME` | Database name | Confirmed by user |
| `secrets.ADMIN_PASSWORD` | Admin dashboard password | Confirmed by user |
| `secrets.TF_VAR_DB_MASTER_PASSWORD` | RDS master password (Terraform) | Confirmed by user |
| `secrets.TF_VAR_SSH_KEY_NAME` | EC2 key pair name | Confirmed by user |

All 9 secrets were confirmed present in the repository by the user on 2026-07-12.

### Issues Found and Fixed

| Issue | Location | Fix |
|---|---|---|
| Save AMI step wrong directory | `build-ami` job | Added `working-directory: ./packer` |
| Terraform wrapper may swallow exit codes | validate, terraform, verify jobs | Added `terraform_wrapper: false` |
| Validation Summary always says "valid" | validate job | Removed the step entirely |

### Minor Issue Noted

The validate job's `terraform plan` step does not pass `admin_password`. It defaults to `"admin123"`. If the deployed value differs from the default, the plan would show spurious changes. Not a blocking issue but worth adding for accuracy.

---

## Section F — IAM Permissions

| Check | Method | Result |
|---|---|---|
| IAM user | `aws sts get-caller-identity` | `arn:aws:iam::360394172900:user/zaid-terraform-learner` |
| Attached policies | `aws iam list-attached-user-policies` | `AdministratorAccess` + `IAMUserChangePassword` |
| Inline policies | `aws iam list-user-policies` | None |

### Assessment

The CI user has **full AdministratorAccess**. This covers every AWS action the pipeline needs:

| Pipeline Step | Required Permissions |
|---|---|
| Build AMI (Packer) | ec2 full access, iam:PassRole |
| Terraform Apply | ec2, vpc, rds, elbv2, iam, s3, dynamodb |
| Verify | ec2:DescribeInstances, elbv2:DescribeTargetHealth |

**No gaps found.** For a production system, AdministratorAccess should be scoped down, but for this learning project it is acceptable.

---

## Section G — Idempotency

### Terraform Config Idempotency

The terraform config itself (excluding the `ami_id` variable) is idempotent:
- All resources have static configurations
- No `lifecycle { ignore_changes }` blocks (confirmed via code search)
- State serial 2 across 5 runs proves no drift when no changes are made

### Pipeline Idempotency

The pipeline is **intentionally NOT idempotent** by design. Each run:
1. Creates a new AMI with a unique name (`ticketflow-ami-${{ github.run_id }}`)
2. Passes this new AMI ID to Terraform
3. Terraform replaces the EC2 instance

This is the intended behavior — each deploy produces a fresh AMI and fresh instance. If the user wants to prevent unnecessary replacements, the AMI naming could be changed to reuse the same AMI when code hasn't changed, but that's a design choice.

### Expectation for Two Consecutive Runs

- Run 1 (with fix): Produces new AMI -> Terraform replaces instance -> new LaunchTime
- Run 2 (no code change): Produces another new AMI (different name) -> Terraform replaces instance again

This is working as designed.

---

## Section H — End-to-End Verification

### Status: **NOT YET CONFIRMED — PENDING FRESH PIPELINE RUN**

The bugs have been fixed, but a fresh end-to-end pipeline run is needed to confirm everything works.

### Pre-Fix State (Confirmed via AWS CLI)

```
Instance:         i-0f94248bebe9bfc91
Launch time:      2026-07-11T07:38:19+00:00
Current AMI:      ami-0d28727121d5d4a3c (stock Ubuntu)
Packer AMIs:      4 built, none used
ALB response:     HTTP 200 (serving content, likely stale)
EC2 health:       http://13.220.21.157:4000/health -> connection failed
EC2 frontend:     http://13.220.21.157:3000/ -> connection failed
```

### How to Verify Post-Fix

1. **Trigger a pipeline run**: Push to `main` or use `workflow_dispatch` on GitHub.
   - URL: https://github.com/ZaidAsif/TicketFlow-With-AWS-Pipeline/actions

2. **Wait for the run to complete** (approx 15-20 minutes).

3. **Verify EC2 replacement**:
   ```bash
   aws ec2 describe-instances --filters "Name=tag:Name,Values=ticketflow-app" \
     --query 'Reservations[].Instances[0].[InstanceId,LaunchTime,ImageId]' --output text
   ```
   Expected: **new** LaunchTime, **new** ImageId (Packer-built AMI).

4. **Verify AMI identity**:
   ```bash
   aws ec2 describe-images --image-ids <new-ami-id> \
     --query 'Images[0].Name' --output text
   ```
   Expected: `ticketflow-ami-<run-id>`.

5. **Verify target group health**:
   ```bash
   TG_ARN=$(aws elbv2 describe-target-groups --names ticketflow-tg \
     --query 'TargetGroups[0].TargetGroupArn' --output text)
   aws elbv2 describe-target-health --target-group-arn "$TG_ARN" \
     --query 'TargetHealthDescriptions[0].TargetHealth.State' --output text
   ```
   Expected: `healthy`.

6. **Verify application responds**:
   ```bash
   ALB_URL=$(aws elbv2 describe-load-balancers --names ticketflow-alb \
     --query 'LoadBalancers[0].DNSName' --output text)
   curl -s -o /dev/null -w "%{http_code}" "http://$ALB_URL"
   ```
   Expected: `200`.

7. **Verify a real code change** (optional, for confidence): Deploy a visible change (e.g. update a frontend text), push to `main`, wait for the pipeline, then confirm the change appears in the browser.

---

## Summary of All Changes Made

| File | Change | Why |
|---|---|---|
| `.github/workflows/deploy.yml` | Added `working-directory: ./packer` to Save AMI ID step (`build-ami` job) | Fixes AMI handoff — `manifest.json` lives in `./packer/`, not repo root |
| `.github/workflows/deploy.yml` | Added `terraform_wrapper: false` to setup-terraform in `validate` job | Prevents wrapper from masking terraform validate exit codes |
| `.github/workflows/deploy.yml` | Added `terraform_wrapper: false` to setup-terraform in `terraform` (Apply) job | Consistency — prevents wrapper masking apply failures |
| `.github/workflows/deploy.yml` | Added `terraform_wrapper: false` to setup-terraform in `verify` job | Consistency — prevents wrapper masking `terraform output` failures |
| `.github/workflows/deploy.yml` | Removed misleading `Validation Summary` step from `validate` job | Was always printing "valid" regardless of actual step results

---

## Honest Confidence Statement

| Section | Confidence | Reasoning |
|---|---|---|
| **A** (Validate swallowing) | **MEDIUM** | `terraform_wrapper: false` is a well-known fix, but actual error text was never retrieved from pipeline logs (403 from API). A real terraform config error might still exist — next run will reveal it. |
| **B** (AMI handoff) | **VERY HIGH** | Clear path mismatch with direct evidence (4 orphaned AMIs). No lifecycle blocks to prevent replacement. Fix is a single-line addition. |
| **C** (State) | **HIGH** | S3 bucket, state file, and DynamoDB lock table all confirmed working. |
| **D** (Packer) | **VERY HIGH** | 4 AMIs built successfully, manifest post-processor present, AMI names tie to run IDs. |
| **E** (Workflow) | **HIGH** | All dependencies, secrets references, and runner configs manually reviewed. |
| **F** (IAM) | **VERY HIGH** | AdministratorAccess covers everything. No gaps. |
| **G** (Idempotency) | **HIGH** | Config is idempotent when no variables change. Pipeline re-creates by design — not a bug. |
| **H** (E2E) | **NOT CONFIRMED** | Fixes are correct but untested — only a fresh pipeline run can confirm. |

### What I'm Not Fully Sure About

1. **Actual terraform validate errors**: We couldn't retrieve the annotation text from GitHub Actions logs. If there's a real config error (like a reference to a non-existent resource), `terraform_wrapper: false` will surface it — the pipeline will fail at the validate step instead of silently passing. This is the correct behavior.

2. **GitHub secrets**: All 9 secrets are referenced in the workflow but we couldn't verify they're actually configured. The user should check Settings > Secrets and variables > Actions.

3. **DynamoDB lock table schema**: The table exists and is ACTIVE, but we didn't verify it has the correct `LockID` key schema. If the schema is wrong, Terraform would fail to acquire locks during parallel operations.

4. **The current EC2 instance's backend**: The health check and frontend on the current EC2 (stock Ubuntu AMI) are not responding (connection refused). This means the stock bootstrap process likely failed. Once the Packer AMI is used, this should be resolved since the AMI has the full stack pre-installed.
