interface user {
  id: string,
  token: string,
}

declare namespace Express {
  export interface Request {
    auth?: user
  }
}