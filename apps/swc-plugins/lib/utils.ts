import { clsx, type ClassValue } from "clsx";
import { Route } from "next";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function route<T extends string>(t: Route<T>): Route {
  return t as Route;
}
