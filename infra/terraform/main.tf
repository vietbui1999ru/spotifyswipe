# main.tf - Proxmox provider and VM resources for SpotiSwipe
#
# Provisions:
#   - N app servers running the Next.js monolith (default: 2)
#   - 1 Nginx load-balancer / reverse-proxy
#   - 1 optional dedicated PostgreSQL server
#
# All VMs are cloned from a cloud-init Ubuntu 22.04 template.

# ---------------------------------------------------------------------------
# Provider
# ---------------------------------------------------------------------------

provider "proxmox" {
  pm_api_url          = var.proxmox_api_url
  pm_api_token_id     = var.proxmox_api_token_id
  pm_api_token_secret = var.proxmox_api_token_secret
  pm_tls_insecure     = var.proxmox_tls_insecure
}

# ---------------------------------------------------------------------------
# App servers - Next.js application (frontend + API + tRPC)
# ---------------------------------------------------------------------------

resource "proxmox_vm_qemu" "app_server" {
  count = var.app_server_count

  name        = "spotiswipe-app-${count.index + 1}"
  desc        = "SpotiSwipe Next.js application server ${count.index + 1}"
  target_node = var.proxmox_node
  vmid        = var.app_server_vmid_start + count.index
  tags        = var.vm_tags

  # Clone from cloud-init template
  clone      = var.vm_template
  full_clone = true
  os_type    = "cloud-init"
  agent      = 1

  # Hardware
  cores   = var.app_server_cores
  sockets = 1
  memory  = var.app_server_memory
  cpu_type = "host"

  # Root disk
  disks {
    scsi {
      scsi0 {
        disk {
          size    = var.app_server_disk_size
          storage = var.storage_pool
        }
      }
    }
  }

  # Network interface
  network {
    id     = 0
    model  = "virtio"
    bridge = var.network_bridge
    tag    = var.vlan_tag != -1 ? var.vlan_tag : null
  }

  # Cloud-init settings
  ipconfig0  = "ip=${var.app_server_ips[count.index]}/${var.network_cidr},gw=${var.network_gateway}"
  nameserver = var.dns_servers
  ciuser     = var.ci_user
  sshkeys    = var.ssh_public_keys

  # Wait for the QEMU guest agent to report the IP before marking as created
  lifecycle {
    ignore_changes = [
      network,
    ]
  }
}

# ---------------------------------------------------------------------------
# Load balancer - Nginx reverse proxy
# ---------------------------------------------------------------------------

resource "proxmox_vm_qemu" "lb_proxy" {
  name        = "spotiswipe-lb"
  desc        = "SpotiSwipe Nginx load balancer / reverse proxy"
  target_node = var.proxmox_node
  vmid        = var.lb_vmid
  tags        = var.vm_tags

  clone      = var.vm_template
  full_clone = true
  os_type    = "cloud-init"
  agent      = 1

  cores   = var.lb_cores
  sockets = 1
  memory  = var.lb_memory
  cpu_type = "host"

  disks {
    scsi {
      scsi0 {
        disk {
          size    = var.lb_disk_size
          storage = var.storage_pool
        }
      }
    }
  }

  network {
    id     = 0
    model  = "virtio"
    bridge = var.network_bridge
    tag    = var.vlan_tag != -1 ? var.vlan_tag : null
  }

  ipconfig0  = "ip=${var.lb_ip}/${var.network_cidr},gw=${var.network_gateway}"
  nameserver = var.dns_servers
  ciuser     = var.ci_user
  sshkeys    = var.ssh_public_keys

  lifecycle {
    ignore_changes = [
      network,
    ]
  }
}

# ---------------------------------------------------------------------------
# Optional dedicated database server
# ---------------------------------------------------------------------------

resource "proxmox_vm_qemu" "db_server" {
  count = var.dedicated_db_server ? 1 : 0

  name        = "spotiswipe-db"
  desc        = "SpotiSwipe dedicated PostgreSQL database server"
  target_node = var.proxmox_node
  vmid        = var.db_server_vmid
  tags        = var.vm_tags

  clone      = var.vm_template
  full_clone = true
  os_type    = "cloud-init"
  agent      = 1

  cores   = var.db_server_cores
  sockets = 1
  memory  = var.db_server_memory
  cpu_type = "host"

  disks {
    scsi {
      scsi0 {
        disk {
          size    = var.db_server_disk_size
          storage = var.storage_pool
        }
      }
    }
  }

  network {
    id     = 0
    model  = "virtio"
    bridge = var.network_bridge
    tag    = var.vlan_tag != -1 ? var.vlan_tag : null
  }

  ipconfig0  = "ip=${var.db_server_ip}/${var.network_cidr},gw=${var.network_gateway}"
  nameserver = var.dns_servers
  ciuser     = var.ci_user
  sshkeys    = var.ssh_public_keys

  lifecycle {
    ignore_changes = [
      network,
    ]
  }
}
