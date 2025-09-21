import { api } from "encore.dev/api";
import db from "../db";

export interface City {
  id: string;
  name: string;
  state: string;
  country: string;
}

export interface CitiesResponse {
  cities: City[];
}

// Retrieves list of available cities.
export const getCities = api<void, CitiesResponse>(
  { expose: true, method: "GET", path: "/public/cities" },
  async () => {
    const cities = await db.queryAll<{
      id: number;
      name: string;
      state: string;
      country: string;
    }>`
      SELECT id, name, state, country
      FROM cities
      WHERE is_active = true
      ORDER BY name ASC
    `;

    return {
      cities: cities.map(c => ({
        id: c.id.toString(),
        name: c.name,
        state: c.state,
        country: c.country
      }))
    };
  }
);
