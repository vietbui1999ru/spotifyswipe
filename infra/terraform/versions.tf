# versions.tf - Required providers and Terraform version constraints
#
# Pin the telmate/proxmox provider to a compatible version range.
# Terraform >= 1.5 is required for the `check` block and other modern features.

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    proxmox = {
      source  = "telmate/proxmox"
      version = "~> 3.0"
    }
  }
}
