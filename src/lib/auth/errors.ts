export class PasswordPolicyError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super(issues.join(" "));
    this.name = "PasswordPolicyError";
    this.issues = [...issues];
  }
}

export class UserAlreadyExistsError extends Error {
  constructor() {
    super("Ya existe una cuenta con ese correo.");
    this.name = "UserAlreadyExistsError";
  }
}
