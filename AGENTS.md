# Agent Instructions

This repository contains a FastAPI backend and a React frontend. It includes a comprehensive set of Cursor AI rules in `.cursor/rules/` which describe the preferred development workflow using Task Master.

## General Guidelines
- Follow the Task Master workflow described in the rules under `.cursor/rules/` when planning or implementing features.
- Keep commit messages clear and descriptive.

## Testing
- Always run the backend test suite after making changes. From the repo root run:
  ```bash
  cd backend
  pytest -q
  ```
- Always run the frontend test suite as well:
  ```bash
  cd frontend
  npm test --silent
  ```
- Ensure all tests pass before committing. The tests work offline so no network is required.

