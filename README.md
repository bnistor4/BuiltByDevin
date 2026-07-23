# Built with Devin

A curated directory of GitHub projects built with [Devin](https://devin.ai), the AI software engineer by Cognition.

This repository automatically indexes GitHub repositories that have the **Devin agent** (`devin-ai-integration[bot]`) listed as a collaborator, signaling that AI-assisted development played a meaningful role in the project. It also supports manual submissions for projects that use Devin but may not have the bot as a collaborator.

## How it works

### Automatic discovery

The directory scans GitHub for repositories where the `devin-ai-integration[bot]` account appears in the collaborators list. This is a strong signal that the project was developed (at least partially) using Devin's AI software engineer.

### Manual submission

Projects can also be added manually. To submit a project:

1. Fork this repository.
2. Add an entry to `projects.json` (or the relevant data file) following the schema below.
3. Open a pull request with a title like `Add: <project-name>`.

#### Entry schema

```json
{
  "name": "project-name",
  "url": "https://github.com/owner/repo",
  "description": "Short one-line description of the project.",
  "language": "TypeScript",
  "tags": ["ai", "developer-tools", "cli"],
  "devin_collaborator": false,
  "submitted_by": "your-github-username"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | yes | Display name of the project |
| `url` | string | yes | GitHub repository URL |
| `description` | string | yes | One-line project description |
| `language` | string | no | Primary language |
| `tags` | string[] | no | Relevant tags for filtering |
| `devin_collaborator` | boolean | no | Whether `devin-ai-integration[bot]` is a collaborator (default: `false` for manual entries) |
| `submitted_by` | string | yes | GitHub username of the submitter |

## Contributing

Contributions are welcome. Whether you're adding a new project, fixing a typo, or improving the indexing logic, please open a pull request or an issue.

## License

MIT
