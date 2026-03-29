export interface GeneratedQuestionAnswer {
  text: string;
  correct: boolean;
  feedback: string | null;
}

export interface GeneratedQuestionPayload {
  order: number;
  outsider: boolean;
  questionText: string;
  explanation: string | null;
  answers: GeneratedQuestionAnswer[];
}

export interface GeneratedQuestionSet {
  questionSetId: string | null;
  questions: GeneratedQuestionPayload[];
}

export interface EligibleUserQuestionProfile {
  id: string;
  gender: string;
  age: number;
  environment: string;
}
