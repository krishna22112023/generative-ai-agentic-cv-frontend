# AgenticVision Web UI

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**The default Web UI for [AgenticVision](https://github.com/krishna22112023/generative-ai-agentic-cv-base.git).**

The goal of this project is to create a computer vision AI AGents Platform for the netire CV model lifecycle through four integrated capability domains including CV AI Agent capabilities, Data management, CV Modelling and model deployment.

## Demo

![demo](https://github.com/langmanus/langmanus/blob/main/assets/demo.gif?raw=true)

## Table of Contents

- [Quick Start](#quick-start)
- [Docker](#docker)
- [Project Statement](#project-statement)
- [Contributing](#contributing)
- [License](#license)
- [Acknowledgments](#acknowledgments)

## Quick Start

### Prerequisites

- [AgenticVision](https://github.com/krishna22112023/generative-ai-agentic-cv-base.git)
- Node.js (v22.14.0+)
- pnpm (v10.6.2+) as package manager

### Configuration

Create a `.env` file in the project root and configure the following environment variables:

- `NEXT_PUBLIC_API_URL`: The URL of the LangManus API.

It's always a good idea to start with the given example file, and edit the `.env` file with your own values:

```bash
cp .env.example .env
```

### Installation

**IMPORTANT: First, **start the Python server**, see [LangManus](https://github.com/langmanus/langmanus) for more details.**

```bash
# Clone the repository
git clone https://github.com/krishna22112023/generative-ai-agentic-cv-frontend
cd generative-ai-agentic-cv-frontend

# Install dependencies
pnpm install 

# Run the project in development mode
pnpm dev
```

Then open your browser and navigate to http://localhost:3000

Have fun!

## Docker

You can also run this project with Docker.

First, you need read the [configuration](#configuration) below. Make sure `.env` file is ready.

Second, to build a Docker image of your own web server:

```bash
docker build --build-arg NEXT_PUBLIC_API_URL=YOUR_API -t generative-ai-agentic-cv-frontend .
```

Final, start up a docker container running the web server:

```bash
# Replace generative-ai-agentic-cv-frontend-app with your preferred container name
docker run -d -t -p 3000:3000 --env-file .env --name generative-ai-agentic-cv-frontend-app generative-ai-agentic-cv-frontend

# stop the server
docker stop generative-ai-agentic-cv-frontend
```

### Docker Compose

You can also setup this project with the docker compose:

```bash
# building docker image
docker compose build

# start the server
docker compose up
```