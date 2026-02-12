import type { components, paths } from "./schema";

export type SchemaMap = components["schemas"];
export type SchemaName = keyof SchemaMap;
export type Schema<K extends SchemaName> = SchemaMap[K];

export type ApiPath = keyof paths;

export interface ApiResponse<T> {
  data: T;
  message?: string;
  status: "success" | "error";
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

export type User = Schema<"UserResponse">;
export type LoginRequest = Schema<"UserLogin">;
export type LoginResponse = Schema<"TokenResponse">;
export type RegisterRequest = Schema<"UserRegister">;

export type PodcastFeed = Schema<"FeedResponse">;
export type PodcastEpisode = Schema<"EpisodeResponse">;

export type ReviewItem = Schema<"ReviewScheduleItem">;
export type ReviewSchedule = Schema<"ReviewScheduleResponse">;

export type StudyProgress = Schema<"StudyProgressResponse">;
export type DictionaryLookupRequest = Schema<"DictionaryLookupRequest">;
export type DictionaryContextRequest = Schema<"DictionaryContextRequest">;

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
  duration: number;
}

export type LoadingState = "idle" | "loading" | "success" | "error";

export interface AsyncData<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}
