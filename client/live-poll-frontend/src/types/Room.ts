export interface Room {
  code: string;
  creator: string;
  question: string;
  options: string[];
  votes: Record<string, number>;
  startTime: number;
  duration: number;
}
