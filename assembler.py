# Assembler - Transforma .asm em .bin
import sys

# Tabela de opcodes
OPCODES = {
    'NOP':   0x00,
    'LOAD':  0x01,
    'STORE': 0x02,
    'LOADI': 0x03,
    'ADD':   0x04,
    'SUB':   0x05,
    'MUL':   0x06,
    'DIV':   0x07,
    'AND':   0x08,
    'OR':    0x09,
    'NOT':   0x0A,
    'JMP':   0x0B,
    'JZ':    0x0C,
    'JNZ':   0x0D,
    'JG':    0x0E,
    'HALT':  0x0F,
    'ADDI':  0x10,
    'SUBI':  0x11,
    'MOV':   0x12,
    'CMP':   0x13,
    'MODI':  0x14,
    'MOD':   0x15,
}

# Mapeamento de registradores
REGS = {'A': 0, 'B': 1}

# Instrucoes que nao precisam de operandos
NO_OPERAND = {'NOP', 'HALT'}

# Instrucoes que usam apenas registrador (sem endereco/imediato)
REG_ONLY = {'NOT'}

# Instrucoes de jump (usam apenas endereco, sem registrador)
JUMP_OPS = {'JMP', 'JZ', 'JNZ', 'JG'}


def assemble(source_code):
    """Monta o codigo assembly em uma lista de words de 32 bits."""
    lines = source_code.split('\n')
    labels = {}
    instructions = []
    data_section = {}
    in_data = False

    # Primeiro passo: coletar labels e limpar linhas
    clean_lines = []
    addr = 0

    for line in lines:
        # Remove comentarios
        line = line.split(';')[0].strip()
        if not line:
            continue

        # Secao de dados
        if line == '.data':
            in_data = True
            continue

        if in_data:
            # Formato: nome: valor
            if ':' in line:
                parts = line.split(':')
                name = parts[0].strip()
                val = int(parts[1].strip()) if parts[1].strip() else 0
                data_section[name] = val
            continue

        # Label
        if line.endswith(':'):
            label_name = line[:-1].strip()
            labels[label_name] = addr
            continue

        # Se a linha tem label inline (LABEL: INSTRUCAO)
        if ':' in line and not line.startswith(('LOAD', 'STORE', 'LOADI', 'ADD', 'SUB',
                                                 'MUL', 'DIV', 'AND', 'OR', 'NOT',
                                                 'JMP', 'JZ', 'JNZ', 'JG', 'HALT',
                                                 'NOP', 'ADDI', 'SUBI', 'MOV', 'CMP',
                                                 'MODI', 'MOD')):
            colon_pos = line.index(':')
            label_name = line[:colon_pos].strip()
            rest = line[colon_pos+1:].strip()
            labels[label_name] = addr
            if rest:
                clean_lines.append(rest)
                addr += 1
            continue

        clean_lines.append(line)
        addr += 1

    # Alocar espaco para dados apos as instrucoes
    # Reservar enderecos 0-3 (NOPs + areas reservadas)
    # Dados vao depois do codigo
    data_start = len(clean_lines) + 4  # +4 porque o codigo comeca no endereco 4
    data_addrs = {}
    for name in data_section:
        data_addrs[name] = data_start
        data_start += 1

    # Segundo passo: gerar instrucoes
    # Primeiro: 4 NOPs para os enderecos reservados (0, 1, 2, 3)
    result = [0x00000000, 0x00000000, 0x00000000, 0x00000000]

    for line in clean_lines:
        parts = line.replace(',', ' ').split()
        mnemonic = parts[0].upper()

        if mnemonic not in OPCODES:
            print(f"ERRO: instrucao desconhecida '{mnemonic}'")
            sys.exit(1)

        opcode = OPCODES[mnemonic]

        if mnemonic in NO_OPERAND:
            # NOP ou HALT - sem operandos
            word = (opcode << 24)

        elif mnemonic in JUMP_OPS:
            # JMP/JZ/JNZ/JG addr_or_label
            target = parts[1]
            if target in labels:
                addr_val = labels[target] + 4  # offset porque codigo comeca no 4
            elif target in data_addrs:
                addr_val = data_addrs[target]
            else:
                addr_val = int(target)
            word = (opcode << 24) | (addr_val & 0xFFFFF)

        elif mnemonic in REG_ONLY:
            # NOT R
            r = REGS.get(parts[1].upper(), 0)
            word = (opcode << 24) | (r << 20)

        elif mnemonic == 'MOV':
            # MOV R1, R2
            r1 = REGS.get(parts[1].upper(), 0)
            r2 = REGS.get(parts[2].upper(), 0)
            word = (opcode << 24) | (r1 << 20) | r2

        else:
            # Instrucoes com registrador e endereco/imediato
            # Formato: INSTR R, addr_or_val
            r = REGS.get(parts[1].upper(), 0)

            operand = parts[2] if len(parts) > 2 else '0'
            if operand in labels:
                val = labels[operand] + 4
            elif operand in data_addrs:
                val = data_addrs[operand]
            else:
                val = int(operand)

            word = (opcode << 24) | (r << 20) | (val & 0xFFFFF)

        result.append(word)

    # Adicionar dados ao final
    for name, value in data_section.items():
        result.append(value & 0xFFFFFFFF)

    return result


def write_bin(words, filename):
    """Escreve a lista de words em arquivo binario (big-endian, 4 bytes por word)."""
    with open(filename, 'wb') as f:
        for word in words:
            f.write(word.to_bytes(4, byteorder='big'))


def main():
    if len(sys.argv) < 2:
        print("Uso: python assembler.py programa.asm [saida.bin]")
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else input_file.replace('.asm', '.bin')

    with open(input_file, 'r', encoding='utf-8') as f:
        source = f.read()

    words = assemble(source)
    write_bin(words, output_file)

    print(f"Montado: {input_file} -> {output_file}")
    print(f"Total: {len(words)} words ({len(words) * 4} bytes)")


if __name__ == '__main__':
    main()
