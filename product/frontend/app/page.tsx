"use client";

import { useEffect, useMemo, useState } from "react";
import { Chess, Square } from "chess.js";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
let USER = "default_user";
let TOKEN = "";

type Tab = "play" | "analysis" | "puzzles" | "coach" | "rules" | "profile";
type Side = "white" | "black";

const glyph: Record<string, string> = {
  wK:"♔",wQ:"♕",wR:"♖",wB:"♗",wN:"♘",wP:"♙",
  bK:"♚",bQ:"♛",bR:"♜",bB:"♝",bN:"♞",bP:"♟"
};


const ICONS: Record<string, string> = {
  play: "M3 8l5 4 4-7 4 7 5-4-2 11H5L3 8zM5 21h14",
  analysis: "M3 3v18h18M7 15l4-4 3 3 6-7",
  puzzles: "M12 3v3M12 18v3M3 12h3M18 12h3M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z",
  coach: "M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z",
  rules: "M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5zM6 19h13",
  profile: "M20 21a8 8 0 0 0-16 0M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"
};
const TITLES: Record<string, [string, string]> = {
  play: ["Play", "Take on the RL engine at your level."],
  analysis: ["Game analysis", "Upload a PGN and review every move."],
  puzzles: ["Puzzles", "Sharpen your tactics."],
  coach: ["AI coach", "Ask anything about your games or chess ideas."],
  rules: ["Rulebook", "Search the laws of chess."],
  profile: ["Profile", "Your rating, stats and saved games."]
};
const PIECE_IMG: Record<string, string> = {
  wK: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHN0eWxlPSJjb2xvci1zY2hlbWU6bGlnaHQgb25seSIgdmlld0JveD0iMCAwIDQ1IDQ1Ij48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiIHN0cm9rZT0iIzAwMCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2Utd2lkdGg9IjEuNSI+PHBhdGggc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIgZD0iTTIyLjUgMTEuNjNWNk0yMCA4aDUiLz48cGF0aCBmaWxsPSIjZmZmIiBzdHJva2UtbGluZWNhcD0iYnV0dCIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIgZD0iTTIyLjUgMjVzNC41LTcuNSAzLTEwLjVjMCAwLTEtMi41LTMtMi41cy0zIDIuNS0zIDIuNWMtMS41IDMgMyAxMC41IDMgMTAuNSIvPjxwYXRoIGZpbGw9IiNmZmYiIGQ9Ik0xMS41IDM3YzUuNSAzLjUgMTUuNSAzLjUgMjEgMHYtN3M5LTQuNSA2LTEwLjVjLTQtNi41LTEzLjUtMy41LTE2IDRWMjd2LTMuNWMtMy41LTcuNS0xMy0xMC41LTE2LTQtMyA2IDUgMTAgNSAxMHoiLz48cGF0aCBkPSJNMTEuNSAzMGM1LjUtMyAxNS41LTMgMjEgMG0tMjEgMy41YzUuNS0zIDE1LjUtMyAyMSAwbS0yMSAzLjVjNS41LTMgMTUuNS0zIDIxIDAiLz48L2c+PC9zdmc+",
  wQ: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHN0eWxlPSJjb2xvci1zY2hlbWU6bGlnaHQgb25seSIgd2lkdGg9IjQ1IiBoZWlnaHQ9IjQ1IiB2aWV3Qm94PSIwIDAgNDUgNDUiPjxnIGZpbGw9IiNmZmYiIGZpbGwtcnVsZT0iZXZlbm9kZCIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMS41Ij48cGF0aCBkPSJNOCAxMmEyIDIgMCAxIDEtNCAwIDIgMiAwIDEgMSA0IDBtMTYuNS00LjVhMiAyIDAgMSAxLTQgMCAyIDIgMCAxIDEgNCAwTTQxIDEyYTIgMiAwIDEgMS00IDAgMiAyIDAgMSAxIDQgME0xNiA4LjVhMiAyIDAgMSAxLTQgMCAyIDIgMCAxIDEgNCAwTTMzIDlhMiAyIDAgMSAxLTQgMCAyIDIgMCAxIDEgNCAwIi8+PHBhdGggc3Ryb2tlLWxpbmVjYXA9ImJ1dHQiIGQ9Ik05IDI2YzguNS0xLjUgMjEtMS41IDI3IDBsMi0xMi03IDExVjExbC01LjUgMTMuNS0zLTE1LTMgMTUtNS41LTE0VjI1TDcgMTR6Ii8+PHBhdGggc3Ryb2tlLWxpbmVjYXA9ImJ1dHQiIGQ9Ik05IDI2YzAgMiAxLjUgMiAyLjUgNCAxIDEuNSAxIDEgLjUgMy41LTEuNSAxLTEuNSAyLjUtMS41IDIuNS0xLjUgMS41LjUgMi41LjUgMi41IDYuNSAxIDE2LjUgMSAyMyAwIDAgMCAxLjUtMSAwLTIuNSAwIDAgLjUtMS41LTEtMi41LS41LTIuNS0uNS0yIC41LTMuNSAxLTIgMi41LTIgMi41LTQtOC41LTEuNS0xOC41LTEuNS0yNyAweiIvPjxwYXRoIGZpbGw9Im5vbmUiIGQ9Ik0xMS41IDMwYzMuNS0xIDE4LjUtMSAyMiAwTTEyIDMzLjVjNi0xIDE1LTEgMjEgMCIvPjwvZz48L3N2Zz4=",
  wR: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHN0eWxlPSJjb2xvci1zY2hlbWU6bGlnaHQgb25seSIgd2lkdGg9IjQ1IiBoZWlnaHQ9IjQ1IiB2aWV3Qm94PSIwIDAgNDUgNDUiPjxnIGZpbGw9IiNmZmYiIGZpbGwtcnVsZT0iZXZlbm9kZCIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMS41Ij48cGF0aCBzdHJva2UtbGluZWNhcD0iYnV0dCIgZD0iTTkgMzloMjd2LTNIOXptMy0zdi00aDIxdjR6bS0xLTIyVjloNHYyaDVWOWg1djJoNVY5aDR2NSIvPjxwYXRoIGQ9Im0zNCAxNC0zIDNIMTRsLTMtMyIvPjxwYXRoIHN0cm9rZS1saW5lY2FwPSJidXR0IiBzdHJva2UtbGluZWpvaW49Im1pdGVyIiBkPSJNMzEgMTd2MTIuNUgxNFYxNyIvPjxwYXRoIGQ9Im0zMSAyOS41IDEuNSAyLjVoLTIwbDEuNS0yLjUiLz48cGF0aCBmaWxsPSJub25lIiBzdHJva2UtbGluZWpvaW49Im1pdGVyIiBkPSJNMTEgMTRoMjMiLz48L2c+PC9zdmc+",
  wB: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHN0eWxlPSJjb2xvci1zY2hlbWU6bGlnaHQgb25seSIgd2lkdGg9IjQ1IiBoZWlnaHQ9IjQ1IiB2aWV3Qm94PSIwIDAgNDUgNDUiPjxnIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0iZXZlbm9kZCIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMS41Ij48ZyBmaWxsPSIjZmZmIiBzdHJva2UtbGluZWNhcD0iYnV0dCI+PHBhdGggZD0iTTkgMzZjMy4zOS0uOTcgMTAuMTEuNDMgMTMuNS0yIDMuMzkgMi40MyAxMC4xMSAxLjAzIDEzLjUgMiAwIDAgMS42NS41NCAzIDItLjY4Ljk3LTEuNjUuOTktMyAuNS0zLjM5LS45Ny0xMC4xMS40Ni0xMy41LTEtMy4zOSAxLjQ2LTEwLjExLjAzLTEzLjUgMS0xLjM1LjQ5LTIuMzIuNDctMy0uNSAxLjM1LTEuOTQgMy0yIDMtMnoiLz48cGF0aCBkPSJNMTUgMzJjMi41IDIuNSAxMi41IDIuNSAxNSAwIC41LTEuNSAwLTIgMC0yIDAtMi41LTIuNS00LTIuNS00IDUuNS0xLjUgNi0xMS41LTUtMTUuNS0xMSA0LTEwLjUgMTQtNSAxNS41IDAgMC0yLjUgMS41LTIuNSA0IDAgMC0uNS41IDAgMnoiLz48cGF0aCBkPSJNMjUgOGEyLjUgMi41IDAgMSAxLTUgMCAyLjUgMi41IDAgMSAxIDUgMHoiLz48L2c+PHBhdGggc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIgZD0iTTE3LjUgMjZoMTBNMTUgMzBoMTVtLTcuNS0xNC41djVNMjAgMThoNSIvPjwvZz48L3N2Zz4=",
  wN: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHN0eWxlPSJjb2xvci1zY2hlbWU6bGlnaHQgb25seSIgd2lkdGg9IjQ1IiBoZWlnaHQ9IjQ1IiB2aWV3Qm94PSIwIDAgNDUgNDUiPjxnIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0iZXZlbm9kZCIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMS41Ij48cGF0aCBmaWxsPSIjZmZmIiBkPSJNMjIgMTBjMTAuNSAxIDE2LjUgOCAxNiAyOUgxNWMwLTkgMTAtNi41IDgtMjEiLz48cGF0aCBmaWxsPSIjZmZmIiBkPSJNMjQgMThjLjM4IDIuOTEtNS41NSA3LjM3LTggOS0zIDItMi44MiA0LjM0LTUgNC0xLjA0Mi0uOTQgMS40MS0zLjA0IDAtMy0xIDAgLjE5IDEuMjMtMSAyLTEgMC00LjAwMyAxLTQtNCAwLTIgNi0xMiA2LTEyczEuODktMS45IDItMy41Yy0uNzMtLjk5NC0uNS0yLS41LTMgMS0xIDMgMi41IDMgMi41aDJzLjc4LTEuOTkyIDIuNS0zYzEgMCAxIDMgMSAzIi8+PHBhdGggZmlsbD0iIzAwMCIgZD0iTTkuNSAyNS41YS41LjUgMCAxIDEtMSAwIC41LjUgMCAxIDEgMSAwbTUuNDMzLTkuNzVhLjUgMS41IDMwIDEgMS0uODY2LS41LjUgMS41IDMwIDEgMSAuODY2LjUiLz48L2c+PC9zdmc+",
  wP: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHN0eWxlPSJjb2xvci1zY2hlbWU6bGlnaHQgb25seSIgd2lkdGg9IjQ1IiBoZWlnaHQ9IjQ1IiB2aWV3Qm94PSIwIDAgNDUgNDUiPjxwYXRoIGZpbGw9IiNmZmYiIHN0cm9rZT0iIzAwMCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2Utd2lkdGg9IjEuNSIgZD0iTTIyLjUgOWMtMi4yMSAwLTQgMS43OS00IDQgMCAuODkuMjkgMS43MS43OCAyLjM4QzE3LjMzIDE2LjUgMTYgMTguNTkgMTYgMjFjMCAyLjAzLjk0IDMuODQgMi40MSA1LjAzLTMgMS4wNi03LjQxIDUuNTUtNy40MSAxMy40N2gyM2MwLTcuOTItNC40MS0xMi40MS03LjQxLTEzLjQ3IDEuNDctMS4xOSAyLjQxLTMgMi40MS01LjAzIDAtMi40MS0xLjMzLTQuNS0zLjI4LTUuNjIuNDktLjY3Ljc4LTEuNDkuNzgtMi4zOCAwLTIuMjEtMS43OS00LTQtNHoiLz48L3N2Zz4=",
  bK: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHN0eWxlPSJjb2xvci1zY2hlbWU6bGlnaHQgb25seSIgdmlld0JveD0iMCAwIDQ1IDQ1Ij48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiIHN0cm9rZT0iIzAwMCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2Utd2lkdGg9IjEuNSI+PHBhdGggc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIgZD0iTTIyLjUgMTEuNlY2Ii8+PHBhdGggZmlsbD0iIzAwMCIgc3Ryb2tlLWxpbmVjYXA9ImJ1dHQiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiIGQ9Ik0yMi41IDI1czQuNS03LjUgMy0xMC41YzAgMC0xLTIuNS0zLTIuNXMtMyAyLjUtMyAyLjVjLTEuNSAzIDMgMTAuNSAzIDEwLjUiLz48cGF0aCBmaWxsPSIjMDAwIiBkPSJNMTEuNSAzN2EyMi4zIDIyLjMgMCAwIDAgMjEgMHYtN3M5LTQuNSA2LTEwLjVjLTQtNi41LTEzLjUtMy41LTE2IDRWMjd2LTMuNWMtMy41LTcuNS0xMy0xMC41LTE2LTQtMyA2IDUgMTAgNSAxMHoiLz48cGF0aCBzdHJva2UtbGluZWpvaW49Im1pdGVyIiBkPSJNMjAgOGg1Ii8+PHBhdGggc3Ryb2tlPSIjZWNlY2VjIiBkPSJNMzIgMjkuNXM4LjUtNCA2LTkuN0MzNC4xIDE0IDI1IDE4IDIyLjUgMjQuNnYyLjEtMi4xQzIwIDE4IDkuOSAxNCA3IDE5LjljLTIuNSA1LjYgNC44IDkgNC44IDkiLz48cGF0aCBzdHJva2U9IiNlY2VjZWMiIGQ9Ik0xMS41IDMwYzUuNS0zIDE1LjUtMyAyMSAwbS0yMSAzLjVjNS41LTMgMTUuNS0zIDIxIDBtLTIxIDMuNWM1LjUtMyAxNS41LTMgMjEgMCIvPjwvZz48L3N2Zz4=",
  bQ: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHN0eWxlPSJjb2xvci1zY2hlbWU6bGlnaHQgb25seSIgd2lkdGg9IjQ1IiBoZWlnaHQ9IjQ1IiB2aWV3Qm94PSIwIDAgNDUgNDUiPjxnIGZpbGwtcnVsZT0iZXZlbm9kZCIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMS41Ij48ZyBzdHJva2U9Im5vbmUiPjxjaXJjbGUgY3g9IjYiIGN5PSIxMiIgcj0iMi43NSIvPjxjaXJjbGUgY3g9IjE0IiBjeT0iOSIgcj0iMi43NSIvPjxjaXJjbGUgY3g9IjIyLjUiIGN5PSI4IiByPSIyLjc1Ii8+PGNpcmNsZSBjeD0iMzEiIGN5PSI5IiByPSIyLjc1Ii8+PGNpcmNsZSBjeD0iMzkiIGN5PSIxMiIgcj0iMi43NSIvPjwvZz48cGF0aCBzdHJva2UtbGluZWNhcD0iYnV0dCIgZD0iTTkgMjZjOC41LTEuNSAyMS0xLjUgMjcgMGwyLjUtMTIuNUwzMSAyNWwtLjMtMTQuMS01LjIgMTMuNi0zLTE0LjUtMyAxNC41LTUuMi0xMy42TDE0IDI1IDYuNSAxMy41eiIvPjxwYXRoIHN0cm9rZS1saW5lY2FwPSJidXR0IiBkPSJNOSAyNmMwIDIgMS41IDIgMi41IDQgMSAxLjUgMSAxIC41IDMuNS0xLjUgMS0xLjUgMi41LTEuNSAyLjUtMS41IDEuNS41IDIuNS41IDIuNSA2LjUgMSAxNi41IDEgMjMgMCAwIDAgMS41LTEgMC0yLjUgMCAwIC41LTEuNS0xLTIuNS0uNS0yLjUtLjUtMiAuNS0zLjUgMS0yIDIuNS0yIDIuNS00LTguNS0xLjUtMTguNS0xLjUtMjcgMHoiLz48cGF0aCBmaWxsPSJub25lIiBzdHJva2UtbGluZWNhcD0iYnV0dCIgZD0iTTExIDM4LjVhMzUgMzUgMSAwIDAgMjMgMCIvPjxwYXRoIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2VjZWNlYyIgZD0iTTExIDI5YTM1IDM1IDEgMCAxIDIzIDBtLTIxLjUgMi41aDIwbS0yMSAzYTM1IDM1IDEgMCAwIDIyIDBtLTIzIDNhMzUgMzUgMSAwIDAgMjQgMCIvPjwvZz48L3N2Zz4=",
  bR: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHN0eWxlPSJjb2xvci1zY2hlbWU6bGlnaHQgb25seSIgd2lkdGg9IjQ1IiBoZWlnaHQ9IjQ1IiB2aWV3Qm94PSIwIDAgNDUgNDUiPjxnIGZpbGwtcnVsZT0iZXZlbm9kZCIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMS41Ij48cGF0aCBzdHJva2UtbGluZWNhcD0iYnV0dCIgZD0iTTkgMzloMjd2LTNIOXptMy41LTcgMS41LTIuNWgxN2wxLjUgMi41em0tLjUgNHYtNGgyMXY0eiIvPjxwYXRoIHN0cm9rZS1saW5lY2FwPSJidXR0IiBzdHJva2UtbGluZWpvaW49Im1pdGVyIiBkPSJNMTQgMjkuNXYtMTNoMTd2MTN6Ii8+PHBhdGggc3Ryb2tlLWxpbmVjYXA9ImJ1dHQiIGQ9Ik0xNCAxNi41IDExIDE0aDIzbC0zIDIuNXpNMTEgMTRWOWg0djJoNVY5aDV2Mmg1VjloNHY1eiIvPjxwYXRoIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2VjZWNlYyIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIgc3Ryb2tlLXdpZHRoPSIxIiBkPSJNMTIgMzUuNWgyMW0tMjAtNGgxOW0tMTgtMmgxN20tMTctMTNoMTdNMTEgMTRoMjMiLz48L2c+PC9zdmc+",
  bB: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHN0eWxlPSJjb2xvci1zY2hlbWU6bGlnaHQgb25seSIgd2lkdGg9IjQ1IiBoZWlnaHQ9IjQ1IiB2aWV3Qm94PSIwIDAgNDUgNDUiPjxnIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0iZXZlbm9kZCIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMS41Ij48ZyBmaWxsPSIjMDAwIiBzdHJva2UtbGluZWNhcD0iYnV0dCI+PHBhdGggZD0iTTkgMzZjMy40LTEgMTAuMS40IDEzLjUtMiAzLjQgMi40IDEwLjEgMSAxMy41IDIgMCAwIDEuNi41IDMgMi0uNyAxLTEuNiAxLTMgLjUtMy40LTEtMTAuMS41LTEzLjUtMS0zLjQgMS41LTEwLjEgMC0xMy41IDEtMS40LjUtMi4zLjUtMy0uNSAxLjQtMiAzLTIgMy0yeiIvPjxwYXRoIGQ9Ik0xNSAzMmMyLjUgMi41IDEyLjUgMi41IDE1IDAgLjUtMS41IDAtMiAwLTIgMC0yLjUtMi41LTQtMi41LTQgNS41LTEuNSA2LTExLjUtNS0xNS41LTExIDQtMTAuNSAxNC01IDE1LjUgMCAwLTIuNSAxLjUtMi41IDQgMCAwLS41LjUgMCAyeiIvPjxwYXRoIGQ9Ik0yNSA4YTIuNSAyLjUgMCAxIDEtNSAwIDIuNSAyLjUgMCAxIDEgNSAweiIvPjwvZz48cGF0aCBzdHJva2U9IiNlY2VjZWMiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiIGQ9Ik0xNy41IDI2aDEwTTE1IDMwaDE1bS03LjUtMTQuNXY1TTIwIDE4aDUiLz48L2c+PC9zdmc+",
  bN: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHN0eWxlPSJjb2xvci1zY2hlbWU6bGlnaHQgb25seSIgd2lkdGg9IjQ1IiBoZWlnaHQ9IjQ1IiB2aWV3Qm94PSIwIDAgNDUgNDUiPjxnIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0iZXZlbm9kZCIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMS41Ij48cGF0aCBmaWxsPSIjMDAwIiBkPSJNMjIgMTBjMTAuNSAxIDE2LjUgOCAxNiAyOUgxNWMwLTkgMTAtNi41IDgtMjEiLz48cGF0aCBmaWxsPSIjMDAwIiBkPSJNMjQgMThjLjM4IDIuOTEtNS41NSA3LjM3LTggOS0zIDItMi44MiA0LjM0LTUgNC0xLjA0LS45NCAxLjQxLTMuMDQgMC0zLTEgMCAuMTkgMS4yMy0xIDItMSAwLTQgMS00LTQgMC0yIDYtMTIgNi0xMnMxLjg5LTEuOSAyLTMuNWMtLjczLTEtLjUtMi0uNS0zIDEtMSAzIDIuNSAzIDIuNWgycy43OC0yIDIuNS0zYzEgMCAxIDMgMSAzIi8+PHBhdGggZmlsbD0iI2VjZWNlYyIgc3Ryb2tlPSIjZWNlY2VjIiBkPSJNOS41IDI1LjVhLjUuNSAwIDEgMS0xIDAgLjUuNSAwIDEgMSAxIDBtNS40My05Ljc1YS41IDEuNSAzMCAxIDEtLjg2LS41LjUgMS41IDMwIDEgMSAuODYuNSIvPjxwYXRoIGZpbGw9IiNlY2VjZWMiIHN0cm9rZT0ibm9uZSIgZD0ibTI0LjU1IDEwLjQtLjQ1IDEuNDUuNS4xNWMzLjE1IDEgNS42NSAyLjQ5IDcuOSA2Ljc1UzM1Ljc1IDI5LjA2IDM1LjI1IDM5bC0uMDUuNWgyLjI1bC4wNS0uNWMuNS0xMC4wNi0uODgtMTYuODUtMy4yNS0yMS4zNHMtNS43OS02LjY0LTkuMTktNy4xNnoiLz48L2c+PC9zdmc+",
  bP: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHN0eWxlPSJjb2xvci1zY2hlbWU6bGlnaHQgb25seSIgd2lkdGg9IjQ1IiBoZWlnaHQ9IjQ1IiB2aWV3Qm94PSIwIDAgNDUgNDUiPjxwYXRoIHN0cm9rZT0iIzAwMCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2Utd2lkdGg9IjEuNSIgZD0iTTIyLjUgOWE0IDQgMCAwIDAtMy4yMiA2LjM4IDYuNDggNi40OCAwIDAgMC0uODcgMTAuNjVjLTMgMS4wNi03LjQxIDUuNTUtNy40MSAxMy40N2gyM2MwLTcuOTItNC40MS0xMi40MS03LjQxLTEzLjQ3YTYuNDYgNi40NiAwIDAgMC0uODctMTAuNjVBNC4wMSA0LjAxIDAgMCAwIDIyLjUgOXoiLz48L3N2Zz4="
};
async function api(path: string, options?: RequestInit) {
  const headers: any = {
    ...(options?.headers as any),
    ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {})
  };

  const r = await fetch(`${API}${path}`, {
    ...options,
    headers
  });

  const data = await r.json().catch(() => ({}));

  if (r.status === 401 && TOKEN) {
    try {
      localStorage.removeItem("chessrl_auth");
    } catch {}
    location.reload();
  }

  if (!r.ok) {
    throw new Error(data.detail || "Request failed");
  }

  return data;
}

function Card({
  children,
  className = ""
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`card ${className}`}>{children}</div>;
}

let _ac: AudioContext | null = null;

function playSound(kind: "move" | "capture" | "check" | "end") {
  try {
    const AC =
      (window as any).AudioContext ||
      (window as any).webkitAudioContext;

    if (!AC) return;

    _ac = _ac || new AC();

    const ac = _ac as AudioContext;

    if (ac.state === "suspended") {
      ac.resume();
    }

    const t = ac.currentTime;

    const tap = (
      st: number,
      freq: number,
      vol: number,
      dur: number
    ) => {
      const n = Math.floor(ac.sampleRate * dur);
      const buf = ac.createBuffer(1, n, ac.sampleRate);
      const d = buf.getChannelData(0);

      for (let i = 0; i < n; i++) {
        d[i] =
          (Math.random() * 2 - 1) *
          Math.pow(1 - i / n, 3);
      }

      const src = ac.createBufferSource();
      const bp = ac.createBiquadFilter();
      const g = ac.createGain();

      src.buffer = buf;
      bp.type = "bandpass";
      bp.frequency.value = freq;
      bp.Q.value = 1.4;
      g.gain.value = vol;

      src.connect(bp);
      bp.connect(g);
      g.connect(ac.destination);
      src.start(t + st);

      const o = ac.createOscillator();
      const og = ac.createGain();

      o.type = "sine";
      o.frequency.setValueAtTime(freq / 8, t + st);
      o.frequency.exponentialRampToValueAtTime(
        freq / 16,
        t + st + 0.08
      );

      og.gain.setValueAtTime(vol * 0.5, t + st);
      og.gain.exponentialRampToValueAtTime(
        0.0001,
        t + st + 0.09
      );

      o.connect(og);
      og.connect(ac.destination);

      o.start(t + st);
      o.stop(t + st + 0.1);
    };

    const bell = (
      st: number,
      f: number,
      d: number,
      v: number
    ) => {
      [1, 2.01, 3.02].forEach((m, i) => {
        const o = ac.createOscillator();
        const g = ac.createGain();
        const vv = v / (i + 1) / 1.5;

        o.type = "sine";
        o.frequency.value = f * m;

        g.gain.setValueAtTime(0.0001, t + st);

        g.gain.exponentialRampToValueAtTime(
          vv,
          t + st + 0.01
        );

        g.gain.exponentialRampToValueAtTime(
          0.0001,
          t + st + d
        );

        o.connect(g);
        g.connect(ac.destination);

        o.start(t + st);
        o.stop(t + st + d);
      });
    };

    if (kind === "move") {
      tap(0, 1800, 1.0, 0.05);
    } else if (kind === "capture") {
      tap(0, 1300, 1.6, 0.07);
      tap(0.055, 1700, 1.0, 0.05);
    } else if (kind === "check") {
      bell(0, 784, 0.5, 0.18);
      bell(0.12, 1047, 0.7, 0.18);
    } else {
      bell(0, 659, 0.8, 0.2);
      bell(0.18, 523, 0.8, 0.2);
      bell(0.36, 392, 1.2, 0.22);
    }
  } catch {}
}

function soundOf(m: any, g: Chess) {
  playSound(
    g.isGameOver()
      ? "end"
      : g.inCheck()
      ? "check"
      : m?.captured
      ? "capture"
      : "move"
  );
}

function evalOf(
  fen: string
): { pct: number; label: string } {
  const g = new Chess(fen);

  if (g.isCheckmate()) {
    return g.turn() === "w"
      ? { pct: 0, label: "0-1" }
      : { pct: 100, label: "1-0" };
  }

  const v: Record<string, number> = {
    p: 1,
    n: 3,
    b: 3,
    r: 5,
    q: 9,
    k: 0
  };

  let d = 0;

  for (const row of g.board()) {
    for (const p of row) {
      if (p) {
        d +=
          (p.color === "w" ? 1 : -1) *
          v[p.type];
      }
    }
  }

  return {
    pct: 100 / (1 + Math.exp(-d / 3.5)),
    label: (d > 0 ? "+" : "") + d.toFixed(1)
  };
}

function Board({
  fen,
  side,
  onMove,
  disabled = false
}: {
  fen: string;
  side: Side;
  onMove: (move: string) => void;
  disabled?: boolean;
}) {
  const game = useMemo(
    () => new Chess(fen),
    [fen]
  );

  const [selected, setSelected] =
    useState<Square | null>(null);

  const [legal, setLegal] =
    useState<Square[]>([]);

  const files =
    side === "white"
      ? ["a","b","c","d","e","f","g","h"]
      : ["h","g","f","e","d","c","b","a"];

  const ranks =
    side === "white"
      ? ["8","7","6","5","4","3","2","1"]
      : ["1","2","3","4","5","6","7","8"];

  const checkSq = game.inCheck()
    ? game
        .board()
        .flat()
        .find(
          p =>
            p &&
            p.type === "k" &&
            p.color === game.turn()
        )?.square
    : undefined;

  const click = (sq: Square) => {
    if (disabled || game.isGameOver()) return;

    if (selected && legal.includes(sq)) {
      const probe = new Chess(fen);

      try {
        const move = probe.move({
          from: selected,
          to: sq,
          promotion: "q"
        });

        soundOf(move, probe);

        onMove(
          move.from +
          move.to +
          (move.promotion || "")
        );
      } catch {}

      setSelected(null);
      setLegal([]);

      return;
    }

    const p = game.get(sq);

    if (
      !p ||
      (
        game.turn() === "w"
          ? p.color !== "w"
          : p.color !== "b"
      )
    ) {
      setSelected(null);
      setLegal([]);
      return;
    }

    setSelected(sq);

    setLegal(
      game
        .moves({
          square: sq,
          verbose: true
        })
        .map(m => m.to as Square)
    );
  };

  return (
    <div className="board-wrap">
      <div className="board">
        {ranks.flatMap((rank, ri) =>
          files.map((file, fi) => {
            const sq =
              `${file}${rank}` as Square;

            const p = game.get(sq);

            const dark =
              (ri + fi) % 2 === 1;

            const isSelected =
              selected === sq;

            const isLegal =
              legal.includes(sq);

            return (
              <button
                key={sq}
                onClick={() => click(sq)}
                className={`square ${
                  dark ? "dark" : "light"
                } ${
                  isSelected ? "selected" : ""
                } ${
                  checkSq === sq ? "check" : ""
                }`}
              >
                {p && (
                  <img className={`piece-img ${p.color === "w" ? "white-piece" : "black-piece"}`} src={PIECE_IMG[`${p.color}${p.type.toUpperCase()}`]} alt="" draggable={false} />
                )}

                {isLegal && (
                  <span
                    className={
                      p
                        ? "capture-dot capture"
                        : "capture-dot"
                    }
                  />
                )}

                {fi === 0 && (
                  <span className="coord rank">
                    {rank}
                  </span>
                )}

                {ri === 7 && (
                  <span className="coord file">
                    {file}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
function PuzzleTrainer({
  puzzle,
  onNext
}: {
  puzzle: any;
  onNext: () => void;
}) {
  const [positionFen, setPositionFen] = useState("");
  const [solutionIndex, setSolutionIndex] = useState(0);
  const [status, setStatus] = useState<
    "playing" | "wrong" | "solved"
  >("playing");
  const [lastMove, setLastMove] = useState("");

  useEffect(() => {
    if (!puzzle) return;

    try {
      const g = new Chess(puzzle.fen);

      // Lichess puzzle FEN is before the opponent's setup move.
      // Play that move automatically so the user gets the actual puzzle position.
      if (puzzle.first_move) {
        const m = puzzle.first_move;
        g.move({
          from: m.slice(0, 2),
          to: m.slice(2, 4),
          promotion: m[4] as any
        });
      }

      setPositionFen(g.fen());
      setSolutionIndex(0);
      setStatus("playing");
      setLastMove("");
    } catch {
      setPositionFen(puzzle.fen);
      setSolutionIndex(0);
      setStatus("playing");
      setLastMove("");
    }
  }, [puzzle?.puzzle_id]);

  const handleMove = (move: string) => {
    if (status === "solved") return;

    const solution = puzzle?.solution || [];
    const expected = solution[solutionIndex];

    if (!expected) return;

    // User played the wrong move.
    if (move !== expected) {
      setStatus("wrong");
      setLastMove(move);
      return;
    }

    try {
      const g = new Chess(positionFen);

      const played = g.move({
        from: move.slice(0, 2),
        to: move.slice(2, 4),
        promotion: move[4] as any
      });

      soundOf(played, g);

      const afterUserMove = g.fen();
      const nextIndex = solutionIndex + 1;

      setLastMove(move);

      // Puzzle completed.
      if (nextIndex >= solution.length) {
        setPositionFen(afterUserMove);
        setSolutionIndex(nextIndex);
        setStatus("solved");
        return;
      }

      // Show the user's correct move first.
      setPositionFen(afterUserMove);
      setSolutionIndex(nextIndex);
      setStatus("playing");

      // Then automatically play the opponent's response.
      setTimeout(() => {
        try {
          const replyGame = new Chess(afterUserMove);
          const reply = solution[nextIndex];

          const replyMove = replyGame.move({
            from: reply.slice(0, 2),
            to: reply.slice(2, 4),
            promotion: reply[4] as any
          });

          soundOf(replyMove, replyGame);
          setPositionFen(replyGame.fen());
          setSolutionIndex(nextIndex + 1);

          // If that was the final move, puzzle is solved.
          if (nextIndex + 1 >= solution.length) {
            setStatus("solved");
          }
        } catch {
          setStatus("solved");
        }
      }, 450);
    } catch {
      setStatus("wrong");
    }
  };

  const retry = () => {
    setStatus("playing");
    setLastMove("");
  };

  if (!positionFen) return null;

  const playerSide: Side =
    new Chess(positionFen).turn() === "w"
      ? "white"
      : "black";

  return (
    <div className="puzzle-layout">
      <div className="puzzle-board">
        <Board
          fen={positionFen}
          side={playerSide}
          onMove={handleMove}
          disabled={
            status === "solved" ||
            status === "wrong"
          }
        />

        <div className={`puzzle-status ${status}`}>
          {status === "playing" && (
            <>
              <b>Your move</b>
              <span>Find the best continuation.</span>
            </>
          )}

          {status === "wrong" && (
            <>
              <b>Try again</b>
              <span>That wasn't the correct move.</span>
              <button
                className="ghost-btn"
                onClick={retry}
              >
                Retry
              </button>
            </>
          )}

          {status === "solved" && (
            <>
              <b>✓ Puzzle solved</b>
              <span>Excellent. You found the continuation.</span>
            </>
          )}
        </div>
      </div>

      <div className="puzzle-info">
        <span className="eyebrow">
          TACTICAL TRAINER
        </span>

        <h2>
          {puzzle?.theme || "Tactics"}
        </h2>

        <p>
          Rating {puzzle?.rating || "—"} · Find the
          best continuation.
        </p>

        {status === "playing" && (
          <div className="puzzle-help">
            Make your move on the board.
          </div>
        )}

        {status === "wrong" && (
          <div className="puzzle-error">
            Incorrect move. Look for another tactical
            idea.
          </div>
        )}

        {status === "solved" && (
          <div className="puzzle-success">
            Puzzle completed successfully.
          </div>
        )}

        <button
          className="gold-btn"
          onClick={onNext}
        >
          Next puzzle →
        </button>
      </div>
    </div>
  );
}
function GameReplay({
  game,
  onClose
}: {
  game: any;
  onClose: () => void;
}) {
  const parsed = useMemo(() => {
    try {
      const loaded = new Chess();

      loaded.loadPgn(game.pgn);

      const history = loaded.history({
        verbose: true
      });

      if (history.length === 0) {
        return {
          moves: [],
          positions: [new Chess().fen()]
        };
      }

      // Position before every move.
      const positions = history.map(
        (m: any) => m.before
      );

      // Add final position.
      const last =
        history[history.length - 1];

      const finalBoard = new Chess(
        last.before
      );

      finalBoard.move(last.san);

      positions.push(
        finalBoard.fen()
      );

      return {
        moves: history,
        positions
      };
    } catch (e) {
      return {
        moves: [],
        positions: [new Chess().fen()],
        error:
          e instanceof Error
            ? e.message
            : "Could not load this game"
      };
    }
  }, [game.pgn]);

  const [moveIndex, setMoveIndex] =
    useState(0);

  useEffect(() => {
    setMoveIndex(0);
  }, [game.id]);

  const moves = parsed.moves;

  const position =
    parsed.positions[moveIndex] ||
    new Chess().fen();

  const currentMove =
    moveIndex > 0
      ? moves[moveIndex - 1]
      : null;

  return (
    <Card className="wide replay-card">
      <div className="section-head">
        <div>
          <span className="eyebrow">
            GAME REPLAY · GAME #{game.id}
          </span>

          <h2>
            {game.result || "Saved game"}
          </h2>

          <p>
            {new Date(
              game.played_at
            ).toLocaleString()}{" "}
            · {game.difficulty || "—"} ·{" "}
            {moves.length} moves
          </p>
        </div>

        <button
          className="ghost-btn"
          onClick={onClose}
        >
          Close replay
        </button>
      </div>

      {parsed.error ? (
        <div className="empty big">
          {parsed.error}
        </div>
      ) : (
        <div className="replay-layout">
          {/* BOARD + CONTROLS */}
          <div>
            <Board
              fen={position}
              side="white"
              onMove={() => {}}
              disabled
            />

            <div className="replay-controls">
              <button
                onClick={() =>
                  setMoveIndex(0)
                }
                disabled={moveIndex === 0}
              >
                ⏮
              </button>

              <button
                onClick={() =>
                  setMoveIndex(i =>
                    Math.max(0, i - 1)
                  )
                }
                disabled={moveIndex === 0}
              >
                ◀
              </button>

              <span>
                {moveIndex === 0
                  ? "Starting position"
                  : `${Math.ceil(
                      moveIndex / 2
                    )}${
                      moveIndex % 2 === 1
                        ? "."
                        : "..."
                    } ${
                      currentMove?.san ||
                      ""
                    }`}
              </span>

              <button
                onClick={() =>
                  setMoveIndex(i =>
                    Math.min(
                      moves.length,
                      i + 1
                    )
                  )
                }
                disabled={
                  moveIndex ===
                  moves.length
                }
              >
                ▶
              </button>

              <button
                onClick={() =>
                  setMoveIndex(
                    moves.length
                  )
                }
                disabled={
                  moveIndex ===
                  moves.length
                }
              >
                ⏭
              </button>
            </div>
          </div>

          {/* GAME INFORMATION + MOVES */}
          <div className="replay-moves">
            <div className="replay-players">
              <div>
                <span>WHITE</span>

                <b>
                  {game.side === "white"
                    ? USER
                    : "ChessRL AI"}
                </b>
              </div>

              <div>
                <span>BLACK</span>

                <b>
                  {game.side === "black"
                    ? USER
                    : "ChessRL AI"}
                </b>
              </div>
            </div>

            <div className="replay-move-list">
              {moves.map(
                (
                  m: any,
                  i: number
                ) => {
                  const number =
                    Math.floor(i / 2) + 1;

                  const active =
                    moveIndex === i + 1;

                  return (
                    <button
                      key={i}
                      className={
                        active
                          ? "replay-move active"
                          : "replay-move"
                      }
                      onClick={() =>
                        setMoveIndex(
                          i + 1
                        )
                      }
                    >
                      <span>
                        {i % 2 === 0
                          ? `${number}.`
                          : `${number}...`}
                      </span>

                      <b>
                        {m.san}
                      </b>
                    </button>
                  );
                }
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
function Login({
  onAuth
}: {
  onAuth: (u: string, t: string) => void;
}) {
  const [mode, setMode] =
    useState<"login" | "register">("login");

  const [u, setU] = useState("");
  const [pw, setPw] = useState("");

  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setErr("");

    try {
      const d = await api(
        `/auth/${mode}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            username: u,
            password: pw
          })
        }
      );

      onAuth(d.username, d.token);
    } catch (e) {
      setErr(
        e instanceof Error
          ? e.message
          : "Something went wrong"
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="login-page">
      <div className="login-card">
        <div className="brand-mark">♞</div>

        <h1>
          Chess<span>RL</span>
        </h1>

        <p>
          {mode === "login"
            ? "Sign in to continue"
            : "Create your account"}
        </p>

        <input
          placeholder="Username"
          value={u}
          onChange={e => setU(e.target.value)}
          autoComplete="username"
        />

        <input
          type="password"
          placeholder="Password"
          value={pw}
          onChange={e => setPw(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter") submit();
          }}
          autoComplete={
            mode === "login"
              ? "current-password"
              : "new-password"
          }
        />

        {err && (
          <div className="login-err">
            {err}
          </div>
        )}

        <button
          className="gold-btn"
          onClick={submit}
          disabled={busy || !u || !pw}
        >
          {busy
            ? "Please wait…"
            : mode === "login"
            ? "Sign in"
            : "Create account"}
        </button>

        <button
          className="link-btn"
          onClick={() => {
            setMode(
              mode === "login"
                ? "register"
                : "login"
            );
            setErr("");
          }}
        >
          {mode === "login"
            ? "New here? Create an account"
            : "Already have an account? Sign in"}
        </button>

        <small>
          The first request can take up to a minute
          while the server wakes up.
        </small>
      </div>
    </main>
  );
}

export default function Home() {
  const [auth, setAuth] =
    useState<{
      user: string;
      token: string;
    } | null>(null);

  const [ready, setReady] =
    useState(false);

  useEffect(() => {
    try {
      const raw =
        localStorage.getItem("chessrl_auth");

      if (raw) {
        const a = JSON.parse(raw);

        TOKEN = a.token;
        USER = a.user;

        setAuth(a);
      }
    } catch {}

    setReady(true);
  }, []);

  const onAuth = (
    user: string,
    token: string
  ) => {
    TOKEN = token;
    USER = user;

    const a = {
      user,
      token
    };

    try {
      localStorage.setItem(
        "chessrl_auth",
        JSON.stringify(a)
      );
    } catch {}

    setAuth(a);
  };

  const logout = () => {
    TOKEN = "";
    USER = "default_user";

    try {
      localStorage.removeItem(
        "chessrl_auth"
      );
    } catch {}

    setAuth(null);
  };

  if (!ready) return null;

  if (!auth) {
    return <Login onAuth={onAuth} />;
  }

  return (
    <App
      key={auth.user}
      user={auth.user}
      onLogout={logout}
    />
  );
}

function App({
  user,
  onLogout
}: {
  user: string;
  onLogout: () => void;
}) {
  USER = user;

  const [tab, setTab] =
    useState<Tab>("play");

  const [fen, setFen] =
    useState(new Chess().fen());

  const [side, setSide] =
    useState<Side>("white");

  const [difficulty, setDifficulty] =
    useState("medium");

  const [engineType, setEngineType] =
    useState("custom");

  const [thinking, setThinking] =
    useState(false);

  const [playHistory, setPlayHistory] =
    useState<any[]>([]);

  const [playError, setPlayError] =
    useState("");

  const [analysis, setAnalysis] =
    useState<any>(null);

  const [analysisId, setAnalysisId] =
    useState<number | null>(null);

  const [profile, setProfile] =
    useState<any>(null);

  const [games, setGames] =
    useState<any[]>([]);
  const [selectedGame, setSelectedGame] =
  useState<any | null>(null);

  const [puzzles, setPuzzles] =
    useState<any[]>([]);

  const [puzzleIndex, setPuzzleIndex] =
    useState(0);

  const [chat, setChat] =
    useState<any[]>([]);

  const [question, setQuestion] =
    useState("");

  const [rules, setRules] =
    useState<any[]>([]);

  const [ruleQuery, setRuleQuery] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const start = (
    newSide: Side = side
  ) => {
    setFen(new Chess().fen());
    setSide(newSide);
    setPlayHistory([]);
    setPlayError("");
    setMessage("");
  };

  const playMove = async (
    move: string
  ) => {
    const prevFen = fen;

    setThinking(true);
    setPlayError("");

    try {
      const g = new Chess(prevFen);

      g.move({
        from: move.slice(0, 2),
        to: move.slice(2, 4),
        promotion: move[4]
      });

      setFen(g.fen());
    } catch {}

    try {
      const callEngine = () =>
        api("/engine_move", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            fen: prevFen,
            move,
            difficulty,
            engine_type: engineType
          })
        });

      let data;

      try {
        data = await callEngine();
      } catch {
        await new Promise(r =>
          setTimeout(r, 3000)
        );

        data = await callEngine();
      }

      if (!data.success) {
        setFen(prevFen);
        setPlayError(
          data.message || "Illegal move"
        );
        return;
      }

      if (data.engine_move) {
        try {
          const g = new Chess(prevFen);

          g.move({
            from: move.slice(0, 2),
            to: move.slice(2, 4),
            promotion: move[4]
          });

          const em = String(
            data.engine_move
          );

          const m =
            em.length >= 4 &&
            !/[^a-h1-8qrbn]/.test(em)
              ? g.move({
                  from: em.slice(0, 2),
                  to: em.slice(2, 4),
                  promotion: em[4]
                })
              : g.move(em);

          soundOf(m, g);
        } catch {}
      }

      setFen(data.fen);

      const updatedHistory = [
        ...playHistory,
        {
          user_move: move,
          engine_move: data.engine_move
        }
      ];

      setPlayHistory(
        updatedHistory
      );

      if (data.game_over) {
        setMessage(
          `Game over — ${data.result}`
        );

        await saveGame(
          updatedHistory,
          data.result
        );
      }
    } catch (e) {
      setFen(prevFen);

      setPlayError(
        e instanceof Error
          ? e.message
          : "Engine unavailable"
      );
    } finally {
      setThinking(false);
    }
  };

  const loadGames = async () => {
    try {
      const d = await api("/games");

      setGames(d.games || []);
    } catch {}
  };

  /*
   * Saves a completed engine game.
   *
   * Important changes:
   * 1. The complete current move history is passed in.
   * 2. The POST is awaited.
   * 3. The backend's returned game_id is used only as confirmation.
   * 4. Game history is refreshed AFTER the save succeeds.
   * 5. No polling/rating loop is used.
   */
  const saveGame = async (
    hist: any[],
    result: string
  ) => {
    try {
      const g = new Chess();

      let n = 0;

      for (const h of hist) {
        for (const m of [
          h.user_move,
          h.engine_move
        ]) {
          if (!m) continue;

          const x = String(m);

          if (
            /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(
              x
            )
          ) {
            g.move({
              from: x.slice(0, 2),
              to: x.slice(2, 4),
              promotion: x[4] as any
            });
          } else {
            g.move(x);
          }

          n++;
        }
      }

      g.setHeader(
        "Event",
        "ChessRL game"
      );

      g.setHeader(
        "White",
        side === "white"
          ? USER
          : "ChessRL engine"
      );

      g.setHeader(
        "Black",
        side === "black"
          ? USER
          : "ChessRL engine"
      );

      const saved = await api(
        "/games",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json"
          },
          body: JSON.stringify({
            pgn: g.pgn(),
            result: String(result || ""),
            difficulty,
            engine_type: engineType,
            side,
            num_moves: n
          })
        }
      );

      /*
       * The backend now returns:
       * {
       *   saved: true,
       *   game_id: <id>
       * }
       *
       * The POST itself confirms the game was
       * inserted, so there is no need to poll.
       */
      await loadGames();
      await loadProfile();

      const gameId =
        saved?.game_id;

      setMessage(
        gameId != null
          ? `Game saved successfully · Game #${gameId} · ${result}`
          : `Game saved successfully · ${result}`
      );
    } catch (e) {
      setMessage(
        e instanceof Error
          ? `Game save failed: ${e.message}`
          : "Game save failed"
      );
    }
  };

  const loadProfile = async () => {
    try {
      setProfile(
        await api(`/profile/${USER}`)
      );
    } catch {}
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const uploadPGN = async (
    file: File
  ) => {
    setLoading(true);
    setMessage("");

    try {
      const pgn =
        await file.text();

      const data = await api(
        "/upload_pgn",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json"
          },
          body: JSON.stringify({
            pgn,
            user_id: USER,
            personality:
              "encouraging"
          })
        }
      );

      setAnalysis(data.analysis);
      setAnalysisId(
        data.game_id
      );

      setProfile(
        data.player_profile
      );

      setMessage(
        data.chatbot_opening ||
          "Game analyzed."
      );

      setTab("analysis");
    } catch (e) {
      setMessage(
        e instanceof Error
          ? e.message
          : "Analysis failed"
      );
    } finally {
      setLoading(false);
    }
  };

  const loadPuzzles = async () => {
    setLoading(true);

    try {
      const data = await api(
        `/puzzles/${USER}?n=8`
      );

      setPuzzles(
        data.puzzles || []
      );

      setPuzzleIndex(0);
      setTab("puzzles");
    } catch (e) {
      setMessage(
        e instanceof Error
          ? e.message
          : "Puzzle loading failed"
      );
    } finally {
      setLoading(false);
    }
  };

  const ask = async () => {
    if (!question.trim()) return;

    const q =
      question.trim();

    setQuestion("");

    setChat(c => [
      ...c,
      {
        role: "user",
        content: q
      }
    ]);

    try {
      const contextSource =
        analysisId
          ? "pgn_analysis"
          : "play_engine";

      const data = await api(
        "/chat",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json"
          },
          body: JSON.stringify({
            question: q,
            user_id: USER,
            game_id: analysisId,
            context_source:
              contextSource,

            play_context:
              contextSource ===
              "play_engine"
                ? {
                    source:
                      "play_engine",
                    difficulty,
                    moves:
                      playHistory,
                    current_fen:
                      fen,
                    game_over:
                      new Chess(
                        fen
                      ).isGameOver(),
                    result: (() => {
                      const c =
                        new Chess(
                          fen
                        );

                      return c.isCheckmate()
                        ? c.turn() === "w"
                          ? "0-1"
                          : "1-0"
                        : c.isGameOver()
                        ? "1/2-1/2"
                        : null;
                    })()
                  }
                : null,

            history: [
              ...chat,
              {
                role: "user",
                content: q
              }
            ],

            personality:
              "encouraging"
          })
        }
      );

      setChat(c => [
        ...c,
        {
          role: "assistant",
          content:
            data.response
        }
      ]);
    } catch (e) {
      setChat(c => [
        ...c,
        {
          role: "assistant",
          content:
            e instanceof Error
              ? e.message
              : "Coach unavailable"
        }
      ]);
    }
  };

  const loadRules = async (
    q = ruleQuery
  ) => {
    try {
      const data = q
        ? await api(
            `/rulebook/search?q=${encodeURIComponent(
              q
            )}`
          )
        : await api(
            "/rulebook"
          );

      setRules(
        data.results ||
          data.entries ||
          []
      );
    } catch (e) {
      setMessage(
        e instanceof Error
          ? e.message
          : "Rulebook unavailable"
      );
    }
  };

  return (
    <main>
      <header className="topbar">
        <div
          className="brand"
          onClick={() =>
            setTab("play")
          }
        >
          <div className="brand-mark">
            ♞
          </div>

          <div>
            <strong>
              CHESS<span>RL</span>
            </strong>

            <small>
              AI CHESS COACH
            </small>
          </div>
        </div>

        <nav>
          {(
            [
              "play",
              "analysis",
              "puzzles",
              "coach",
              "rules",
              "profile"
            ] as Tab[]
          ).map(x => (
            <button
              key={x}
              className={
                tab === x
                  ? "nav-active"
                  : ""
              }
              onClick={() => {
                setTab(x);

                if (
                  x === "puzzles"
                ) {
                  loadPuzzles();
                }

                if (
                  x === "rules"
                ) {
                  loadRules("");
                }

                if (
                  x === "profile"
                ) {
                  loadProfile();
                  loadGames();
                }
              }}
            >
              <svg viewBox="0 0 24 24" className="ico"><path d={ICONS[x]} /></svg><span>{x}</span></button>
          ))}
        </nav>

        <div className="online">
          <i />
          {user.toUpperCase()}

          <button
            className="logout"
            onClick={onLogout}
          >
            LOG OUT
          </button>
        </div>
      </header>

      <section className="pagehead">
        <div>
          <h1>{TITLES[tab][0]}</h1>
          <p>{TITLES[tab][1]}</p>
        </div>
        <div className="elo-chip">
          <b>{profile?.est_elo || "—"}</b>
          <span>Est. Elo</span>
        </div>
      </section>

      {message && (
        <div className="toast">
          {message}
        </div>
      )}

      {tab === "play" && (
        <section className="workspace">
          <div className="play-main">
            <div className="section-head">
              <div>
                <span className="eyebrow">
                  LIVE GAME
                </span>

                <h2>
                  You vs ChessRL
                </h2>
              </div>

              <div className="controls">
                <select
                  value={difficulty}
                  onChange={e =>
                    setDifficulty(
                      e.target.value
                    )
                  }
                >
                  <option>
                    easy
                  </option>

                  <option>
                    medium
                  </option>

                  <option>
                    hard
                  </option>
                </select>

                <select
                  value={engineType}
                  onChange={e =>
                    setEngineType(
                      e.target.value
                    )
                  }
                >
                  <option value="custom">
                    RL Engine
                  </option>

                  <option value="stockfish">
                    Search Engine
                  </option>
                </select>

                <button
                  className="gold-btn"
                  onClick={() =>
                    start(side)
                  }
                >
                  New game
                </button>
              </div>
            </div>

            <div className="game-grid">
              {(() => {
                const ev =
                  evalOf(fen);

                return (
                  <div
                    className="eval-rail"
                    title={`Material: ${ev.label}`}
                    style={{
                      justifyContent:
                        side === "white"
                          ? "flex-end"
                          : "flex-start"
                    }}
                  >
                    <div
                      className="eval-fill"
                      style={{
                        height: `${ev.pct}%`
                      }}
                    />
                  </div>
                );
              })()}

              <Board
                fen={fen}
                side={side}
                onMove={playMove}
                disabled={
                  thinking
                }
              />

              <Card className="game-panel">
                <div className="opponent">
                  <div className="avatar">
                    ♞
                  </div>

                  <div>
                    <b>
                      ChessRL AI
                    </b>

                    <small>
                      {thinking
                        ? "Thinking…"
                        : difficulty.toUpperCase()}
                    </small>
                  </div>

                  <span className="dot" />
                </div>

                <div className="move-list">
                  {playHistory.length ===
                  0 ? (
                    <div className="empty">
                      Make your first move.
                    </div>
                  ) : (
                    playHistory.map(
                      (m, i) => (
                        <div key={i}>
                          <span>
                            {i + 1}.
                          </span>

                          <b>
                            {m.user_move}
                          </b>

                          <b>
                            {m.engine_move ||
                              "—"}
                          </b>
                        </div>
                      )
                    )
                  )}
                </div>

                <div className="panel-actions">
                  <button
                    onClick={() =>
                      setSide(
                        side ===
                        "white"
                          ? "black"
                          : "white"
                      )
                    }
                  >
                    Flip board
                  </button>

                  <button
                    onClick={() =>
                      start(side)
                    }
                  >
                    Reset
                  </button>
                </div>
              </Card>
            </div>
          </div>
        </section>
      )}

      {tab === "analysis" && (
        <section className="content-grid">
          <Card className="wide">
            <div className="section-head">
              <div>
                <span className="eyebrow">
                  ANALYSIS LAB
                </span>

                <h2>
                  Understand your game
                </h2>
              </div>

              <label className="upload">
                Upload PGN

                <input
                  type="file"
                  accept=".pgn,.txt"
                  onChange={e =>
                    e.target.files?.[0] &&
                    uploadPGN(
                      e.target.files[0]
                    )
                  }
                />
              </label>
            </div>

            {!analysis ? (
              <div className="empty big">
                {loading
                  ? "Analyzing your game…"
                  : "Upload a PGN to get move-by-move analysis, weaknesses and coaching."}
              </div>
            ) : (
              <div className="analysis-body">
                <div className="metric-row">
                  {[
                    [
                      "Blunders",
                      analysis.summary
                        ?.blunders ??
                        "—"
                    ],
                    [
                      "Mistakes",
                      analysis.summary
                        ?.mistakes ??
                        "—"
                    ],
                    [
                      "Inaccuracies",
                      analysis.summary
                        ?.inaccuracies ??
                        "—"
                    ],
                    [
                      "Avg CP loss",
                      analysis.summary
                        ?.avg_cp_loss ??
                        "—"
                    ],
                    [
                      "Weakness",
                      analysis.summary
                        ?.primary_weakness ??
                        "—"
                    ]
                  ].map(x => (
                    <div
                      className="metric"
                      key={x[0]}
                    >
                      <span>
                        {x[0]}
                      </span>

                      <b>
                        {String(x[1])}
                      </b>
                    </div>
                  ))}
                </div>

                <div className="moves-table">
                  {(analysis.moves ||
                    []).map(
                    (
                      m: any,
                      i: number
                    ) => (
                      <div
                        className="analysis-row"
                        key={i}
                      >
                        <span>
                          {m.move_number ??
                            i + 1}
                        </span>

                        <b>
                          {m.move}
                        </b>

                        <span>
                          {
                            m.classification
                          }
                        </span>

                        <span>
                          {m.mistake_type ||
                            "—"}
                        </span>

                        <span>
                          {m.cp_loss ??
                            0}{" "}
                          cp
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
          </Card>
        </section>
      )}

      {tab === "puzzles" && (
  <section className="content-grid">
    <Card className="wide">
      <div className="section-head">
        <div>
          <span className="eyebrow">
            TACTICAL TRAINER
          </span>

          <h2>
            Train your weakness
          </h2>
        </div>

        <button
          className="ghost-btn"
          onClick={loadPuzzles}
        >
          Refresh
        </button>
      </div>

      {puzzles.length === 0 ? (
        <div className="empty big">
          Play and analyze a few games to unlock
          personalized puzzles.
        </div>
      ) : (
        <PuzzleTrainer
          puzzle={puzzles[puzzleIndex]}
          onNext={() =>
            setPuzzleIndex(
              (puzzleIndex + 1) % puzzles.length
            )
          }
        />
      )}
    </Card>
  </section>
)}

      {tab === "coach" && (
        <section className="content-grid">
          <Card className="wide coach">
            <div className="section-head">
              <div>
                <span className="eyebrow">
                  AI COACH
                </span>

                <h2>
                  Ask about your chess
                </h2>
              </div>
            </div>

            <div className="chat-window">
              {chat.length ===
                0 && (
                <div className="empty big">
                  Ask things like
                  “Why was my move
                  bad?” or “What should
                  I work on?”
                </div>
              )}

              {chat.map(
                (m, i) => (
                  <div
                    className={
                      m.role === "user"
                        ? "chat user"
                        : "chat"
                    }
                    key={i}
                  >
                    <span>
                      {m.role === "user"
                        ? "YOU"
                        : "COACH"}
                    </span>

                    <p>
                      {m.content}
                    </p>
                  </div>
                )
              )}
            </div>

            <div className="chat-input">
              <input
                value={question}
                onChange={e =>
                  setQuestion(
                    e.target.value
                  )
                }
                onKeyDown={e =>
                  e.key === "Enter" &&
                  ask()
                }
                placeholder="Ask your chess coach…"
              />

              <button
                className="gold-btn"
                onClick={ask}
              >
                Send
              </button>
            </div>
          </Card>
        </section>
      )}

      {tab === "rules" && (
        <section className="content-grid">
          <Card className="wide">
            <div className="section-head">
              <div>
                <span className="eyebrow">
                  CHESS KNOWLEDGE
                </span>

                <h2>
                  Rulebook
                </h2>
              </div>

              <div className="search">
                <input
                  value={ruleQuery}
                  onChange={e =>
                    setRuleQuery(
                      e.target.value
                    )
                  }
                  placeholder="Search a rule…"
                />

                <button
                  onClick={() =>
                    loadRules()
                  }
                >
                  Search
                </button>
              </div>
            </div>

            <div className="rules">
              {rules.map(
                (
                  r: any,
                  i: number
                ) => (
                  <div
                    className="rule"
                    key={r.id || i}
                  >
                    <span>
                      {r.category ||
                        "RULE"}
                    </span>

                    <h3>
                      {r.title}
                    </h3>

                    <p>
                      {r.description}
                    </p>
                  </div>
                )
              )}
            </div>
          </Card>
        </section>
      )}

      {tab === "profile" && (
        <section className="content-grid">
          <Card>
            <span className="eyebrow">
              PLAYER
            </span>

            <div className="profile-score">
              {profile?.est_elo ||
                800}
            </div>

            <p>
              Estimated rating
            </p>

            <div className="profile-line">
              <span>
                Games analyzed
              </span>

              <b>
                {profile?.games_played ||
                  0}
              </b>
            </div>

            <div className="profile-line">
              <span>
                Avg CP loss
              </span>

              <b>
                {profile?.avg_cp_loss ||
                  0}
              </b>
            </div>

            <div className="profile-line">
              <span>
                Primary weakness
              </span>

              <b>
                {profile?.primary_weakness ||
                  "general"}
              </b>
            </div>
          </Card>

          <Card className="wide">
            <span className="eyebrow">
              RECENT GAMES
            </span>

            <h2>
              Progress
            </h2>

            <div className="history">
              {(
                profile?.recent_games ||
                []
              ).map(
                (
                  g: any,
                  i: number
                ) => (
                  <div key={i}>
                    <span>
                      {new Date(
                        g.played_at
                      ).toLocaleDateString()}
                    </span>

                    <b>
                      {
                        g.primary_weakness
                      }
                    </b>

                    <span>
                      {g.avg_cp_loss} cp
                      loss
                    </span>
                  </div>
                )
              )}
            </div>
          </Card>

          <Card className="wide">
  <span className="eyebrow">
    GAME HISTORY
  </span>

  <h2>
    Games vs engine
  </h2>

  <p className="replay-hint">
    Click any saved game to open the full board replay.
  </p>

  <div className="history">
    {games.length === 0 ? (
      <div className="empty">
        No saved games yet. Finish a game and it will appear here.
      </div>
    ) : (
      games.map((g: any) => (
        <button
          className={`saved-game-row ${
            selectedGame?.id === g.id ? "selected" : ""
          }`}
          key={g.id}
          onClick={() => setSelectedGame(g)}
        >
          <span>
            {new Date(g.played_at).toLocaleString()}
          </span>

          <b>
            {g.result}
          </b>

          <span>
            {g.difficulty} · {g.num_moves} moves
          </span>

          <span className="saved-game-open">
            View game →
          </span>
        </button>
      ))
    )}
  </div>
</Card>

{selectedGame && (
  <GameReplay
    game={selectedGame}
    onClose={() => setSelectedGame(null)}
  />
)}
        </section>
      )}

      <footer>
        CHESSRL <span>•</span>{" "}
        YOUR ENGINE. YOUR GAMES.
        YOUR PROGRESS.
      </footer>
    </main>
  );
}
