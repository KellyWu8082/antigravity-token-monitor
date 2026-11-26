export function workspaceSelectionKey(input: {
  readonly workspacePath: string | null;
  readonly repoName: string | null;
}): string {
  return input.workspacePath ?? input.repoName ?? "__unassigned__";
}
