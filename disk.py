# Modulo de Disco - Le arquivo binario e carrega na memoria
import memory

def read(filename):
    with open(filename, "rb") as f:
        data = f.read()

    # Cada word = 4 bytes (32 bits), big-endian
    num_words = len(data) // 4
    for i in range(num_words):
        word = int.from_bytes(data[i*4:(i+1)*4], byteorder='big')
        memory.write_word(i, word)
