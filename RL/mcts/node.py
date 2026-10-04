import numpy as np
import math
import chess
import torch
from RL.chess_env.features import HalfKPExtractor
halfkp_extractor = HalfKPExtractor()

class Node:
    def __init__(self, game, args, state, parent=None, action_taken=None, policy_from_nn=None):
        self.game = game
        self.args = args
        self.state = state
        self.parent = parent
        self.action_taken = action_taken
        self.children = {}
        self.visit_count = 0
        self.value_sum = 0
        self.policy = policy_from_nn
        self.valid_moves = game.get_valid_moves(state).numpy()

    def select(self):
        legal_actions = np.where(self.valid_moves == 1)[0]
        if len(legal_actions) == 0:
            return None
        sqrt_n = math.sqrt(max(1, self.visit_count))
        best_action, best_score = None, -np.inf
        for action in legal_actions:
            prior = self.policy[action] if self.policy is not None else 1.0 / len(legal_actions)
            child = self.children.get(action)
            if child is not None and child.visit_count > 0:
                q = -child.value_sum / child.visit_count
                u = self.args['C'] * prior * sqrt_n / (1 + child.visit_count)
            else:
                q = 0.0
                u = self.args['C'] * prior * sqrt_n
            if q + u > best_score:
                best_score, best_action = q + u, action
        return best_action

    def expand(self, policy_probs, value=None):
        self.policy = policy_probs

    def back_propagate(self, value):
        self.value_sum += value
        self.visit_count += 1
