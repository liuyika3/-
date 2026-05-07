# Build from dmoes repository root (parent of vibe-portfolio):
#   docker build -f vibe-portfolio/Dockerfile -t vibe-portfolio .
#
# Run (embed middleware needs full tree under /repo):
#   docker run --rm -p 4173:4173 vibe-portfolio
#
# Then open http://localhost:4173/ — put Cloudflare Tunnel / reverse proxy + auth in front for production.

FROM node:22-alpine
WORKDIR /repo

COPY . .

WORKDIR /repo/vibe-portfolio
RUN npm ci && npm run build

ENV NODE_ENV=production
EXPOSE 4173

CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "4173"]
