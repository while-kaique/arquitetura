# Modulo de Memoria - 1024 words de 32 bits
MEM_SIZE = 1024
WORD_MASK = 0xFFFFFFFF

mem = [0] * MEM_SIZE

def read_word(addr):
    return mem[addr]

def write_word(addr, value):
    mem[addr] = value & WORD_MASK

def reset():
    global mem
    mem = [0] * MEM_SIZE
