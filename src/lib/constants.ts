import type { Program, RoomSize } from "@/types";

export const ROOM_SIZES: RoomSize[] = ["small", "medium", "large"];

export const ROOM_SIZE_LABEL: Record<RoomSize, string> = {
  small: "Small",
  medium: "Medium",
  large: "Large",
};

// Maximum capacity for each room size, used for validation when creating/updating rooms.
export const ROOM_SIZE_CAPACITY_MAX: Record<RoomSize, number> = {
  small: 20,
  medium: 50,
  large: 80,
};

export const DEFAULT_ROOM_LOCATION = "11th Floor, Wissawa Wattana Building, KMUTT, Bangkok";

export const PROGRAM_LABEL: Record<Program, string> = {
  regular: "Regular Program",
  international: "International Program",
  health_data_science: "Health Data Science Program",
};
