const FIRST_NAMES = ['Amelia', 'Arthur', 'Clara', 'Daniel', 'Elena', 'Elias', 'Fatima', 'Felix', 'Grace', 'Hana', 'Hugo', 'Isabel', 'Isaac', 'Jonah', 'Layla', 'Leo', 'Lucia', 'Maya', 'Miriam', 'Nadia', 'Nathan', 'Nora', 'Oliver', 'Oscar', 'Priya', 'Rafael', 'Rose', 'Samira', 'Samuel', 'Sofia', 'Theo', 'Zara'];
const SURNAMES = ['Bennett', 'Brooks', 'Clarke', 'Collins', 'Diaz', 'Ellis', 'Evans', 'Flores', 'Foster', 'Garcia', 'Grant', 'Hayes', 'Hughes', 'Khan', 'Kim', 'Laurent', 'Lewis', 'Martin', 'Morgan', 'Nguyen', 'Patel', 'Reed', 'Rivera', 'Rossi', 'Shaw', 'Silva', 'Singh', 'Turner', 'Walker', 'Wells'];

export function generateCitizenName(familyName?: string): string {
  const first = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const last = familyName || SURNAMES[Math.floor(Math.random() * SURNAMES.length)];
  return `${first} ${last}`;
}