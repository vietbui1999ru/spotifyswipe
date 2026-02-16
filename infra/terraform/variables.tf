# variables.tf - All configurable variables for Proxmox VM provisioning
#
# Every value that might change between environments (Proxmox node name,
# network bridge, storage pool, VM sizes, etc.) is exposed as a variable
# so the configuration stays portable across different Proxmox clusters.

# ---------------------------------------------------------------------------
# Proxmox connection
# ---------------------------------------------------------------------------

variable "proxmox_api_url" {
  description = "URL of the Proxmox API (e.g. https://pve.example.com:8006/api2/json)"
  type        = string
}

variable "proxmox_api_token_id" {
  description = "Proxmox API token ID (e.g. terraform@pam!terraform-token)"
  type        = string
}

variable "proxmox_api_token_secret" {
  description = "Proxmox API token secret"
  type        = string
  sensitive   = true
}

variable "proxmox_tls_insecure" {
  description = "Skip TLS verification for self-signed Proxmox certificates"
  type        = bool
  default     = false
}

# ---------------------------------------------------------------------------
# Proxmox cluster / node
# ---------------------------------------------------------------------------

variable "proxmox_node" {
  description = "Name of the Proxmox node where VMs will be created"
  type        = string
  default     = "pve"
}

variable "storage_pool" {
  description = "Proxmox storage pool for VM disks (e.g. local-lvm, ceph, zfs)"
  type        = string
  default     = "local-lvm"
}

variable "cloud_init_storage" {
  description = "Storage pool for cloud-init ISO images"
  type        = string
  default     = "local-lvm"
}

variable "vm_template" {
  description = "Name of the Ubuntu 22.04 cloud-init template to clone"
  type        = string
  default     = "ubuntu-2204-cloud-init"
}

# ---------------------------------------------------------------------------
# Networking
# ---------------------------------------------------------------------------

variable "network_bridge" {
  description = "Proxmox network bridge for VM interfaces (e.g. vmbr0)"
  type        = string
  default     = "vmbr0"
}

variable "vlan_tag" {
  description = "VLAN tag for VM network interfaces (-1 to disable)"
  type        = number
  default     = -1
}

variable "network_gateway" {
  description = "Default gateway IP for the VM network"
  type        = string
  default     = "10.0.0.1"
}

variable "network_cidr" {
  description = "CIDR suffix for VM IPs (e.g. 24 for /24)"
  type        = number
  default     = 24
}

variable "dns_servers" {
  description = "Space-separated DNS server IPs for cloud-init"
  type        = string
  default     = "1.1.1.1 8.8.8.8"
}

# ---------------------------------------------------------------------------
# SSH
# ---------------------------------------------------------------------------

variable "ssh_public_keys" {
  description = "SSH public key(s) injected via cloud-init (one key per line)"
  type        = string
}

variable "ci_user" {
  description = "Default user created by cloud-init"
  type        = string
  default     = "ubuntu"
}

# ---------------------------------------------------------------------------
# App servers (Next.js)
# ---------------------------------------------------------------------------

variable "app_server_count" {
  description = "Number of application server VMs to provision"
  type        = number
  default     = 2
}

variable "app_server_cores" {
  description = "vCPU cores per application server"
  type        = number
  default     = 2
}

variable "app_server_memory" {
  description = "RAM in MB per application server"
  type        = number
  default     = 4096
}

variable "app_server_disk_size" {
  description = "Root disk size per application server (e.g. 30G)"
  type        = string
  default     = "30G"
}

variable "app_server_ips" {
  description = "Static IPs for app servers (list length must match app_server_count)"
  type        = list(string)
  default     = ["10.0.0.11", "10.0.0.12"]
}

variable "app_server_vmid_start" {
  description = "First VM ID for app servers (subsequent VMs increment by 1)"
  type        = number
  default     = 200
}

# ---------------------------------------------------------------------------
# Load balancer / reverse proxy (Nginx)
# ---------------------------------------------------------------------------

variable "lb_cores" {
  description = "vCPU cores for the load balancer VM"
  type        = number
  default     = 1
}

variable "lb_memory" {
  description = "RAM in MB for the load balancer VM"
  type        = number
  default     = 2048
}

variable "lb_disk_size" {
  description = "Root disk size for the load balancer (e.g. 20G)"
  type        = string
  default     = "20G"
}

variable "lb_ip" {
  description = "Internal network IP for the load balancer"
  type        = string
  default     = "10.0.0.10"
}

variable "lb_vmid" {
  description = "VM ID for the load balancer"
  type        = number
  default     = 199
}

# ---------------------------------------------------------------------------
# Optional dedicated database server
# ---------------------------------------------------------------------------

variable "dedicated_db_server" {
  description = "When true, provision a separate VM for PostgreSQL instead of running it on app-server-1"
  type        = bool
  default     = false
}

variable "db_server_cores" {
  description = "vCPU cores for the dedicated database server"
  type        = number
  default     = 2
}

variable "db_server_memory" {
  description = "RAM in MB for the dedicated database server"
  type        = number
  default     = 4096
}

variable "db_server_disk_size" {
  description = "Root disk size for the database server (e.g. 40G)"
  type        = string
  default     = "40G"
}

variable "db_server_ip" {
  description = "Static IP for the dedicated database server"
  type        = string
  default     = "10.0.0.20"
}

variable "db_server_vmid" {
  description = "VM ID for the dedicated database server"
  type        = number
  default     = 210
}

# ---------------------------------------------------------------------------
# Tags
# ---------------------------------------------------------------------------

variable "vm_tags" {
  description = "Comma-separated tags applied to all VMs for identification"
  type        = string
  default     = "spotiswipe"
}
