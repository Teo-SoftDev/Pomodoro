export class PasswordPolicyError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super(issues.join(" "));
    this.name = "PasswordPolicyError";
    this.issues = [...issues];
  }
}
