// seatId: solo letras, números y guiones, 1 a 20 caracteres (ej: "12", "A15", "vip-3")
const SEAT_ID_REGEX = /^[a-zA-Z0-9-]{1,20}$/;

// userId: solo letras, números, guiones y guion bajo, 1 a 50 caracteres
const USER_ID_REGEX = /^[a-zA-Z0-9_-]{1,50}$/;

export function isValidSeatId(seatId: string): boolean {
  return SEAT_ID_REGEX.test(seatId);
}

export function isValidUserId(userId: string): boolean {
  return typeof userId === "string" && USER_ID_REGEX.test(userId);
}
