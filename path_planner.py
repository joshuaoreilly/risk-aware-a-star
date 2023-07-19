import typing
import numpy as np
import math
import queue
from nest_info import Coordinate, DeliverySite, NestInfo


class PathPlanner:
    # Penalty weight for entering hight risk zone. A value of 0 will solve the shortest path problem.
    # A value of 13 will maximally avoid entering the high risk zone
    HIGH_RISK_PENALTY = 13

    def __init__(self, nest_info: NestInfo, delivery_sites: typing.List["DeliverySite"]):
        self.nest_info: NestInfo = nest_info
        self.delivery_sites: typing.List["DeliverySite"] = delivery_sites

    def plan_paths(self):
        """
        Uses a modified version of the A* (A-Star) algorithm to determine the shortest path from
        the nest to each delivery site. Two separate cost-to-reach terms are tracked:

        The first cost-to-reach is the true distance from the nest to a given coordinate and is used to
        ensure the total path length does not exceed the maximum.

        The second cost-to-reach has an additional penalty term for when a given coordinate is in the High
        Risk zone, and is used to determine whether the cost to reach a coordinate has improved, and which
        coordinate to select from the priority queue.
        """
        for site in self.delivery_sites:
            # DIstance from nest to current coordinate along optimal path found so far
            cost_to_reach: dict[Coordinate, float] = {}
            # Distance from nest to current coordinate, including penalty for traversing high risk areas
            cost_to_reach_penalized: dict[Coordinate, float] = {}
            # (Heuristic) distance from current coordinate to delivery site, as the crow flies
            cost_to_go: dict[Coordinate, float] = {}
            # Coordinates of previous point in the optimal path to the current coordinate
            parent: dict[Coordinate, Coordinate] = {}
            # List of coordinates to visit, sorted by lowest combined cost-to-go and cost-to-reach (w/ penalty)
            to_visit = queue.PriorityQueue()
            
            # Initialize with nest as current coordinate
            cost_to_reach[self.nest_info.nest_coord] = 0.
            cost_to_reach_penalized[self.nest_info.nest_coord] = 0.
            cost_to_go[self.nest_info.nest_coord] = self.euclidian_norm(self.nest_info.nest_coord, site.coord)
            parent[self.nest_info.nest_coord] = None
            to_visit.put((cost_to_reach_penalized[self.nest_info.nest_coord] + cost_to_go[self.nest_info.nest_coord], self.nest_info.nest_coord))

            # Continue iterating through neighbors until we run out of valid ones or find the delivery site
            valid_path_found = False
            while not to_visit.empty():
                _, current_coord = to_visit.get()
                # Found the delivery site, generate path
                if current_coord == site.coord:
                    site.set_path(self.get_path(current_coord, parent))
                    valid_path_found = True
                    break
                else:
                    neighbors = self.get_neighbors(current_coord)
                    for neighbor in neighbors:
                        new_cost_to_reach = (cost_to_reach[current_coord]
                                            + self.euclidian_norm(current_coord, neighbor)
                        )
                        new_cost_to_reach_penalized = (cost_to_reach_penalized[current_coord]
                                            + self.euclidian_norm(current_coord, neighbor)
                                            + (self.nest_info.risk_zones[neighbor.e][neighbor.n]
                                                * PathPlanner.HIGH_RISK_PENALTY
                                            )
                        )
                        cost_to_go[neighbor] = self.euclidian_norm(neighbor, site.coord)
                        # Neighbor hasn't been visited or the new cost to reach (w/ penalty) is lower,
                        # and the total path length (with euclidian cost-to-go) doesn't exceed the
                        # maximum range
                        if ((neighbor not in cost_to_reach or
                            new_cost_to_reach_penalized < cost_to_reach_penalized[neighbor]) and
                            new_cost_to_reach + cost_to_go[neighbor] <= self.nest_info.maximum_range):
                            cost_to_reach[neighbor] = new_cost_to_reach
                            cost_to_reach_penalized[neighbor] = new_cost_to_reach_penalized
                            parent[neighbor] = current_coord
                            to_visit.put((new_cost_to_reach_penalized + cost_to_go[neighbor], neighbor))
            # If this point is reached, then there is no valid path (that doesn't exceed the maximum range)
            # Panic!
            if not valid_path_found:
                print('No valid path found under maximum range')

    def get_neighbors(self, coord: Coordinate):
        """
        Return a list of (valid) neighbors.
        Includes only those which are within the risk map and are not labeled "Keep Out"
        """
        e = coord.e
        n = coord.n
        neighbors = [Coordinate(e+1, n), Coordinate(e+1, n-1), Coordinate(e+1, n+1),
                    Coordinate(e, n-1), Coordinate(e, n+1),
                    Coordinate(e-1, n), Coordinate(e-1, n-1), Coordinate(e-1, n+1)]
        # return only valid neighbors
        return filter(self.is_valid_coord, neighbors)

    def is_valid_coord(self, coord: Coordinate):
        """
        Checks whether coordinate is within risk map and not within "Keep out"
        """
        in_bounds = (coord.e >= 0 and
                    coord.e < self.nest_info.risk_zones.shape[0] and
                    coord.n >= 0 and
                    coord.n < self.nest_info.risk_zones.shape[1]
        )
        if in_bounds:
            keep_out = self.nest_info.risk_zones[coord.e][coord.n] < NestInfo.KEEP_OUT_VALUE
            return keep_out
        return in_bounds

    def euclidian_norm(self, coord1: Coordinate, coord2: Coordinate):
        """
        Straight line distance between two coordinates
        """
        return math.sqrt((coord1.e - coord2.e)**2 + (coord1.n - coord2.n)**2)

    def get_path(self, delivery_site: Coordinate, parent: dict[Coordinate, Coordinate]):
        """
        Creates a path from nest to delivery site
        """
        current_coord = delivery_site
        path = [delivery_site]
        while(parent[current_coord] != None):
            current_coord = parent[current_coord]
            path.insert(0, current_coord)
        return(path)

