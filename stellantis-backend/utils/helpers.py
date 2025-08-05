import math

def safe_float(val):
    if isinstance(val, float) and math.isnan(val):
        return None
    return val
