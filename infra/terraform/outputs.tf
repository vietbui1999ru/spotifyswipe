# outputs.tf - Output values for use by Ansible and other tooling
#
# After `terraform apply`, run `terraform output` to retrieve IPs and the
# generated Ansible inventory content.

# ---------------------------------------------------------------------------
# Individual IP outputs
# ---------------------------------------------------------------------------

output "app_server_ips" {
  description = "IP addresses of the application server VMs"
  value       = [for vm in proxmox_vm_qemu.app_server : vm.default_ipv4_address]
}

output "lb_proxy_ip" {
  description = "IP address of the load balancer VM"
  value       = proxmox_vm_qemu.lb_proxy.default_ipv4_address
}

output "db_server_ip" {
  description = "IP address of the dedicated database server (empty string if not provisioned)"
  value       = var.dedicated_db_server ? proxmox_vm_qemu.db_server[0].default_ipv4_address : ""
}

# ---------------------------------------------------------------------------
# Convenience: which host runs PostgreSQL
# ---------------------------------------------------------------------------

output "database_host" {
  description = "The IP that should be used for DATABASE_URL (db server if dedicated, otherwise app-server-1)"
  value       = var.dedicated_db_server ? proxmox_vm_qemu.db_server[0].default_ipv4_address : proxmox_vm_qemu.app_server[0].default_ipv4_address
}

# ---------------------------------------------------------------------------
# Ansible inventory (INI format)
# ---------------------------------------------------------------------------

output "ansible_inventory" {
  description = "Generated Ansible inventory content in INI format"
  value = templatefile("${path.module}/templates/inventory.ini.tftpl", {
    ci_user        = var.ci_user
    app_server_ips = [for vm in proxmox_vm_qemu.app_server : vm.default_ipv4_address]
    lb_ip          = proxmox_vm_qemu.lb_proxy.default_ipv4_address
    db_ip          = var.dedicated_db_server ? proxmox_vm_qemu.db_server[0].default_ipv4_address : ""
    has_db_server  = var.dedicated_db_server
  })
}
