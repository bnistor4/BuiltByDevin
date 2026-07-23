export interface Project {
  /** Display name of the project */
  name: string;
  /** GitHub repository URL */
  url: string;
  /** One-line project description */
  description: string;
  /** Primary language */
  language?: string;
  /** Relevant tags for filtering */
  tags?: string[];
  /** Whether `devin-ai-integration[bot]` is a collaborator */
  devin_collaborator?: boolean;
  /** GitHub username of the submitter */
  submitted_by: string;
}
