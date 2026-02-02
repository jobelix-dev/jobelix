#!/usr/bin/env bash
#
# Jobelix Linux Installer
# Usage: curl -fsSL https://jobelix.fr/install.sh | bash
#
# This script:
# 1. Detects your Linux distribution (Arch/Ubuntu)
# 2. Downloads the correct AppImage from GitHub releases
# 3. Installs it to ~/.local/bin/
# 4. Creates a desktop entry with proper environment variables
# 5. Installs the application icon
#
# The desktop entry includes APPIMAGE_EXTRACT_AND_RUN=1 to avoid
# slow FUSE mounting on systems where FUSE is slow or unavailable.
#

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
GITHUB_REPO="jobelix-dev/jobelix-releases"
INSTALL_DIR="$HOME/.local/bin"
DESKTOP_DIR="$HOME/.local/share/applications"
ICON_DIR="$HOME/.local/share/icons/hicolor/512x512/apps"
APP_NAME="jobelix"

# Print colored message
info() { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# Detect Linux distribution
detect_distro() {
    if [[ ! -f /etc/os-release ]]; then
        warn "Cannot detect distribution, defaulting to Ubuntu build"
        echo "ubuntu-22.04"
        return
    fi

    local id id_like
    id=$(grep "^ID=" /etc/os-release | cut -d= -f2 | tr -d '"')
    id_like=$(grep "^ID_LIKE=" /etc/os-release 2>/dev/null | cut -d= -f2 | tr -d '"' || echo "")

    # Arch-based distributions
    local arch_distros="arch manjaro endeavouros garuda arco artix cachyos"
    for distro in $arch_distros; do
        if [[ "$id" == "$distro" ]] || [[ "$id_like" == *"$distro"* ]]; then
            echo "arch"
            return
        fi
    done

    # Default to Ubuntu for Debian-based and others
    echo "ubuntu-22.04"
}

# Get latest release version from GitHub
get_latest_version() {
    local version
    version=$(curl -fsSL "https://api.github.com/repos/${GITHUB_REPO}/releases/latest" | 
              grep '"tag_name"' | 
              sed -E 's/.*"tag_name": *"v?([^"]+)".*/\1/')
    
    if [[ -z "$version" ]]; then
        error "Failed to get latest version from GitHub"
    fi
    
    echo "$version"
}

# Download AppImage
download_appimage() {
    local version=$1
    local distro=$2
    local filename="Jobelix-${version}-${distro}.AppImage"
    local url="https://github.com/${GITHUB_REPO}/releases/download/v${version}/${filename}"
    local dest="${INSTALL_DIR}/${APP_NAME}.AppImage"

    info "Downloading Jobelix v${version} for ${distro}..."
    
    mkdir -p "$INSTALL_DIR"
    
    if command -v wget &> /dev/null; then
        wget -q --show-progress -O "$dest" "$url" || error "Download failed"
    elif command -v curl &> /dev/null; then
        curl -fSL --progress-bar -o "$dest" "$url" || error "Download failed"
    else
        error "Neither wget nor curl found. Please install one of them."
    fi

    chmod +x "$dest"
    success "Downloaded to $dest"
}

# Download and install icon
install_icon() {
    local icon_url="https://raw.githubusercontent.com/jobelix-dev/jobelix-releases/main/build/icon.png"
    local icon_dest="${ICON_DIR}/${APP_NAME}.png"

    info "Installing application icon..."
    
    mkdir -p "$ICON_DIR"
    
    # Try to download from repo first
    if curl -fsSL -o "$icon_dest" "$icon_url" 2>/dev/null && [[ -s "$icon_dest" ]]; then
        success "Icon installed"
    else
        info "Extracting icon from AppImage..."
        # Extract icon from AppImage
        local appimage="${INSTALL_DIR}/${APP_NAME}.AppImage"
        if [[ -f "$appimage" ]]; then
            local tmpdir=$(mktemp -d)
            cd "$tmpdir"
            "$appimage" --appimage-extract "usr/share/icons/hicolor/512x512/apps/*.png" &>/dev/null || true
            
            # Find the extracted icon
            local extracted_icon=$(find squashfs-root -name "*.png" -type f 2>/dev/null | head -1)
            if [[ -n "$extracted_icon" && -f "$extracted_icon" ]]; then
                cp "$extracted_icon" "$icon_dest"
                success "Icon extracted and installed"
            else
                # Try alternative location
                "$appimage" --appimage-extract "*.png" &>/dev/null || true
                extracted_icon=$(find squashfs-root -name "*.png" -type f 2>/dev/null | head -1)
                if [[ -n "$extracted_icon" && -f "$extracted_icon" ]]; then
                    cp "$extracted_icon" "$icon_dest"
                    success "Icon extracted and installed"
                else
                    warn "Could not extract icon from AppImage"
                fi
            fi
            rm -rf "$tmpdir"
            cd - > /dev/null
        fi
    fi

    # Update icon cache if available
    if command -v gtk-update-icon-cache &> /dev/null; then
        gtk-update-icon-cache -f -t "$HOME/.local/share/icons/hicolor" 2>/dev/null || true
    fi
}

# Create desktop entry
create_desktop_entry() {
    local appimage="${INSTALL_DIR}/${APP_NAME}.AppImage"

    info "Creating desktop entry..."
    
    mkdir -p "$DESKTOP_DIR"

    cat > "${DESKTOP_DIR}/${APP_NAME}.desktop" << EOF
[Desktop Entry]
Name=Jobelix
Comment=AI-powered job search assistant
Exec=env APPIMAGE_EXTRACT_AND_RUN=1 ${appimage} %U
Icon=${APP_NAME}
Type=Application
Categories=Utility;Office;
Terminal=false
StartupNotify=true
StartupWMClass=Jobelix
EOF

    # Make desktop file executable (required by some desktop environments)
    chmod +x "${DESKTOP_DIR}/${APP_NAME}.desktop"

    # Update desktop database if available
    if command -v update-desktop-database &> /dev/null; then
        update-desktop-database "$DESKTOP_DIR" 2>/dev/null || true
    fi

    success "Desktop entry created"
}

# Create shell wrapper for CLI usage
create_wrapper() {
    local wrapper="${INSTALL_DIR}/${APP_NAME}"
    local appimage="${INSTALL_DIR}/${APP_NAME}.AppImage"

    info "Creating command-line wrapper..."

    # Create wrapper script
    # - APPIMAGE_EXTRACT_AND_RUN=1 extracts to /tmp instead of FUSE mounting (faster)
    # - Redirect stdout to /dev/null during extraction, then restore for app output
    # - The AppImage prints file listing during extraction which we want to hide
    cat > "$wrapper" << WRAPPER_EOF
#!/usr/bin/env bash
# Jobelix launcher - sets environment for fast startup
export APPIMAGE_EXTRACT_AND_RUN=1

# Run AppImage, filtering out the extraction file listing
# The listing goes to stdout before the app starts
exec "${appimage}" "\$@" 2>&1 | grep -v "^/tmp/appimage_extracted_"
WRAPPER_EOF

    chmod +x "$wrapper"
    success "CLI wrapper created at $wrapper"
}

# Add ~/.local/bin to PATH in shell config files
setup_path() {
    local path_line='export PATH="$HOME/.local/bin:$PATH"'
    local path_comment="# Added by Jobelix installer"
    
    # Check if already in PATH
    if [[ ":$PATH:" == *":$HOME/.local/bin:"* ]]; then
        success "~/.local/bin is already in PATH"
        return
    fi

    info "Adding ~/.local/bin to PATH..."

    # Detect shell and add to appropriate rc file
    local shell_name=$(basename "$SHELL")
    local rc_files=()

    case "$shell_name" in
        bash)
            [[ -f "$HOME/.bashrc" ]] && rc_files+=("$HOME/.bashrc")
            [[ -f "$HOME/.bash_profile" ]] && rc_files+=("$HOME/.bash_profile")
            # If neither exists, create .bashrc
            [[ ${#rc_files[@]} -eq 0 ]] && rc_files+=("$HOME/.bashrc")
            ;;
        zsh)
            rc_files+=("$HOME/.zshrc")
            ;;
        fish)
            # Fish uses different syntax
            local fish_config="$HOME/.config/fish/config.fish"
            mkdir -p "$(dirname "$fish_config")"
            if ! grep -q ".local/bin" "$fish_config" 2>/dev/null; then
                echo "" >> "$fish_config"
                echo "# Added by Jobelix installer" >> "$fish_config"
                echo 'set -gx PATH $HOME/.local/bin $PATH' >> "$fish_config"
                success "Added to $fish_config"
            fi
            return
            ;;
        *)
            # Default to bashrc for unknown shells
            rc_files+=("$HOME/.bashrc")
            ;;
    esac

    # Add to each rc file if not already present
    for rc_file in "${rc_files[@]}"; do
        if [[ -f "$rc_file" ]] && grep -q ".local/bin" "$rc_file" 2>/dev/null; then
            success "PATH already configured in $rc_file"
        else
            echo "" >> "$rc_file"
            echo "$path_comment" >> "$rc_file"
            echo "$path_line" >> "$rc_file"
            success "Added PATH to $rc_file"
        fi
    done

    echo ""
    warn "PATH updated! Run this to use 'jobelix' command immediately:"
    echo -e "  ${YELLOW}source ~/.${shell_name}rc${NC}  (or restart your terminal)"
    echo ""
}

# Main installation
main() {
    echo ""
    echo -e "${BLUE}╔══════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║       ${GREEN}Jobelix Linux Installer${BLUE}            ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════╝${NC}"
    echo ""

    # Check requirements
    if ! command -v curl &> /dev/null && ! command -v wget &> /dev/null; then
        error "This installer requires curl or wget"
    fi

    # Detect distribution
    local distro
    distro=$(detect_distro)
    info "Detected distribution: $distro"

    # Get latest version
    local version
    version=$(get_latest_version)
    info "Latest version: v${version}"

    # Check for existing installation
    if [[ -f "${INSTALL_DIR}/${APP_NAME}.AppImage" ]]; then
        warn "Existing installation found, will be updated"
    fi

    # Download and install
    download_appimage "$version" "$distro"
    install_icon
    create_desktop_entry
    create_wrapper
    setup_path

    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║     Installation Complete! 🎉            ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
    echo ""
    echo "You can now:"
    echo -e "  • Launch from your application menu (search for ${YELLOW}Jobelix${NC})"
    echo -e "  • Run from terminal: ${YELLOW}jobelix${NC}"
    echo ""
    echo "To uninstall, run:"
    echo -e "  ${YELLOW}rm ~/.local/bin/jobelix ~/.local/bin/jobelix.AppImage${NC}"
    echo -e "  ${YELLOW}rm ~/.local/share/applications/jobelix.desktop${NC}"
    echo -e "  ${YELLOW}rm ~/.local/share/icons/hicolor/512x512/apps/jobelix.png${NC}"
    echo ""
}

# Run main function
main "$@"
