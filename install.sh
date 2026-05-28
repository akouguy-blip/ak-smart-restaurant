#!/usr/bin/env bash
# ============================================================
# AK Smart Restaurant — Installeur Mac / Linux
#
# Utilisation : ./install.sh
# Ce script vérifie Docker, génère les secrets et démarre tout.
# ============================================================

set -e

# Couleurs terminal
GOLD='\033[1;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
DIM='\033[2m'
NC='\033[0m'

echo
echo -e "${GOLD}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${GOLD}║        AK Smart Restaurant — Installation        ║${NC}"
echo -e "${GOLD}╚══════════════════════════════════════════════════╝${NC}"
echo

# ----------------------------------------------------------------
# 1. Vérifier Docker
# ----------------------------------------------------------------
if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗ Docker n'est pas installé.${NC}"
    echo
    echo "Télécharge Docker Desktop ici :"
    echo "  https://www.docker.com/products/docker-desktop/"
    echo
    echo "Une fois installé, relance cette commande."
    exit 1
fi

if ! docker info &> /dev/null; then
    echo -e "${RED}✗ Docker n'est pas démarré.${NC}"
    echo
    echo "Lance Docker Desktop et attends que l'icône baleine 🐳 soit verte."
    echo "Puis relance cette commande."
    exit 1
fi

DOCKER_VERSION=$(docker --version | awk '{print $3}' | tr -d ',')
echo -e "${GREEN}✓${NC} Docker installé (${DIM}$DOCKER_VERSION${NC})"

# ----------------------------------------------------------------
# 2. Créer .env avec des secrets si absent
# ----------------------------------------------------------------
if [ ! -f .env ]; then
    echo
    echo -e "${GOLD}→${NC} Génération de la configuration initiale…"

    # Génération de secrets aléatoires
    if command -v openssl &> /dev/null; then
        DB_PASS=$(openssl rand -hex 16)
        JWT_SEC=$(openssl rand -hex 32)
    else
        DB_PASS=$(head -c 16 /dev/urandom | xxd -p -c 32)
        JWT_SEC=$(head -c 32 /dev/urandom | xxd -p -c 64)
    fi

    cat > .env << EOF
# Configuration générée le $(date)
HTTP_PORT=80
DB_PASSWORD=$DB_PASS
JWT_SECRET=$JWT_SEC
EOF
    echo -e "${GREEN}✓${NC} Fichier .env créé avec des secrets uniques"
else
    echo -e "${GREEN}✓${NC} Fichier .env existant détecté (conservé)"
fi

# ----------------------------------------------------------------
# 3. Construire les images Docker
# ----------------------------------------------------------------
echo
echo -e "${GOLD}→${NC} Construction des images Docker"
echo -e "  ${DIM}(5 à 10 minutes la première fois, ensuite quelques secondes)${NC}"
echo

docker compose build

# ----------------------------------------------------------------
# 4. Démarrer les services
# ----------------------------------------------------------------
echo
echo -e "${GOLD}→${NC} Démarrage des services…"
docker compose up -d

# ----------------------------------------------------------------
# 5. Attendre que tout soit prêt
# ----------------------------------------------------------------
echo -e "${GOLD}→${NC} Attente de la disponibilité de l'application…"
HTTP_PORT=$(grep ^HTTP_PORT .env | cut -d= -f2)
HTTP_PORT=${HTTP_PORT:-80}

READY=0
for i in $(seq 1 30); do
    if curl -sf "http://localhost:$HTTP_PORT" > /dev/null 2>&1; then
        READY=1
        break
    fi
    printf "."
    sleep 2
done
echo

if [ $READY -eq 0 ]; then
    echo
    echo -e "${RED}⚠ L'application n'a pas répondu après 60 secondes.${NC}"
    echo "Vérifie les logs avec :"
    echo "  docker compose logs -f backend"
    echo "  docker compose logs -f frontend"
    exit 1
fi

# ----------------------------------------------------------------
# 6. Détecter l'IP locale (utile pour les téléphones du staff)
# ----------------------------------------------------------------
LOCAL_IP=""
if command -v hostname &> /dev/null && hostname -I &> /dev/null; then
    LOCAL_IP=$(hostname -I | awk '{print $1}')
elif command -v ipconfig &> /dev/null; then
    # macOS
    LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "")
fi
LOCAL_IP=${LOCAL_IP:-IP-de-votre-ordinateur}

PORT_SUFFIX=""
if [ "$HTTP_PORT" != "80" ]; then
    PORT_SUFFIX=":$HTTP_PORT"
fi

# ----------------------------------------------------------------
# 7. Récap final
# ----------------------------------------------------------------
echo
echo -e "${GREEN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         ✓ INSTALLATION TERMINÉE                  ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════╝${NC}"
echo
echo -e "${GOLD}🌐 Accès à l'application${NC}"
echo "   Sur cet ordinateur : http://localhost${PORT_SUFFIX}"
echo "   Depuis le WiFi     : http://${LOCAL_IP}${PORT_SUFFIX}"
echo
echo -e "${GOLD}📱 Pour les tablettes/téléphones du restaurant${NC}"
echo "   Demande-leur d'ouvrir Chrome ou Safari et de taper :"
echo -e "   ${GREEN}http://${LOCAL_IP}${PORT_SUFFIX}${NC}"
echo
echo -e "${GOLD}🔑 Comptes pré-configurés${NC} (à changer plus tard)"
echo "   Cuisine    → PIN 1234"
echo "   Caisse     → PIN 5678"
echo "   Gérant     → PIN 9999"
echo
echo -e "${GOLD}📋 Tester immédiatement${NC}"
echo "   Client     → http://${LOCAL_IP}${PORT_SUFFIX}/t/07"
echo "   Cuisine    → http://${LOCAL_IP}${PORT_SUFFIX}/kitchen"
echo "   Caisse     → http://${LOCAL_IP}${PORT_SUFFIX}/caisse"
echo "   Admin      → http://${LOCAL_IP}${PORT_SUFFIX}/admin"
echo
echo -e "${DIM}Commandes utiles :${NC}"
echo -e "   ${DIM}docker compose logs -f       — voir les logs en direct${NC}"
echo -e "   ${DIM}docker compose restart       — redémarrer après modif${NC}"
echo -e "   ${DIM}docker compose down          — arrêter (données conservées)${NC}"
echo -e "   ${DIM}docker compose down -v       — arrêter ET effacer les données${NC}"
echo
