## Prerequisites

To run the backend following components are necessary.

1. Postgres with Vector DB support; To run Vector DB, the docker compose file is provided in the project's `infra/db` directory.
2. Redis; No setup given, assuming developer would be smart enough to connect a working Redis environment.
3. LLM; This codebase is built wit model switching support. Users can use either a model from Groq cloud, or run a model (Ollama based)locally. This setup process is also not part of this readme doc
4. Do not forget to create a .env file based on the env.txt file from the root directory

## Installation

```bash
$ npm install
```

## Running the app

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```
