import { useQuery } from "@tanstack/react-query";
import {
  propertiesApi, categoriesApi, locationsApi, agentsApi, statsApi,
  type PropertyFilters,
} from "@/services/api";
import type { Property, PropertyCategory, Location, Agent } from "@/types/property";

export function useProperties(filters?: PropertyFilters) {
  return useQuery({
    queryKey: ["properties", filters],
    queryFn: () => propertiesApi.list(filters) as Promise<Property[]>,
  });
}

export function useProperty(id: string) {
  return useQuery({
    queryKey: ["property", id],
    queryFn: () => propertiesApi.get(id) as Promise<Property>,
    enabled: !!id,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: () => categoriesApi.list() as Promise<PropertyCategory[]>,
  });
}

export function useLocations() {
  return useQuery({
    queryKey: ["locations"],
    queryFn: () => locationsApi.list() as Promise<Location[]>,
  });
}

export function useAgents() {
  return useQuery({
    queryKey: ["agents"],
    queryFn: () => agentsApi.list() as Promise<Agent[]>,
  });
}

export function useAgent(id: string) {
  return useQuery({
    queryKey: ["agent", id],
    queryFn: () => agentsApi.get(id),
    enabled: !!id,
  });
}

export function useStats() {
  return useQuery({
    queryKey: ["stats"],
    queryFn: () => statsApi.get(),
  });
}
