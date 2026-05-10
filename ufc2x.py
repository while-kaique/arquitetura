# Processador UFC2X - CPU simulada de 32 bits
import memory

# Registradores
reg = {
    'A': 0,
    'B': 0,
}
pc = 4  # Program counter - comeca no endereco 4 (0-3 reservados)

# Flags
zero_flag = False
sign_flag = False

# Opcodes
NOP   = 0x00
LOAD  = 0x01
STORE = 0x02
LOADI = 0x03
ADD   = 0x04
SUB   = 0x05
MUL   = 0x06
DIV   = 0x07
AND   = 0x08
OR    = 0x09
NOT   = 0x0A
JMP   = 0x0B
JZ    = 0x0C
JNZ   = 0x0D
JG    = 0x0E
HALT  = 0x0F
ADDI  = 0x10
SUBI  = 0x11
MOV   = 0x12
CMP   = 0x13
MODI  = 0x14
MOD   = 0x15

# Mapeamento de indice para nome de registrador
REG_MAP = {0: 'A', 1: 'B'}

def _decode(instruction):
    """Decodifica uma instrucao de 32 bits.
    [8 bits opcode] [4 bits reg] [20 bits imediato/endereco]
    """
    opcode = (instruction >> 24) & 0xFF
    r = (instruction >> 20) & 0x0F
    imm = instruction & 0xFFFFF
    return opcode, r, imm

def _update_flags(value):
    """Atualiza flags baseado no valor resultante."""
    global zero_flag, sign_flag
    value_32 = value & 0xFFFFFFFF
    zero_flag = (value_32 == 0)
    # Trata como signed 32-bit
    sign_flag = (value_32 >> 31) == 1

def _get_reg_name(r):
    """Retorna o nome do registrador pelo indice."""
    return REG_MAP.get(r, 'A')

def step():
    """Executa um ciclo da CPU. Retorna True para continuar, False para parar."""
    global pc, zero_flag, sign_flag

    # Busca instrucao
    instruction = memory.read_word(pc)
    pc += 1

    # Decodifica
    opcode, r, imm = _decode(instruction)
    rn = _get_reg_name(r)

    # Executa
    if opcode == NOP:
        pass

    elif opcode == LOAD:
        reg[rn] = memory.read_word(imm)
        _update_flags(reg[rn])

    elif opcode == STORE:
        memory.write_word(imm, reg[rn])

    elif opcode == LOADI:
        reg[rn] = imm & 0xFFFFFFFF
        _update_flags(reg[rn])

    elif opcode == ADD:
        reg[rn] = (reg[rn] + memory.read_word(imm)) & 0xFFFFFFFF
        _update_flags(reg[rn])

    elif opcode == SUB:
        reg[rn] = (reg[rn] - memory.read_word(imm)) & 0xFFFFFFFF
        _update_flags(reg[rn])

    elif opcode == MUL:
        reg[rn] = (reg[rn] * memory.read_word(imm)) & 0xFFFFFFFF
        _update_flags(reg[rn])

    elif opcode == DIV:
        divisor = memory.read_word(imm)
        if divisor != 0:
            reg[rn] = (reg[rn] // divisor) & 0xFFFFFFFF
        _update_flags(reg[rn])

    elif opcode == AND:
        reg[rn] = (reg[rn] & memory.read_word(imm)) & 0xFFFFFFFF
        _update_flags(reg[rn])

    elif opcode == OR:
        reg[rn] = (reg[rn] | memory.read_word(imm)) & 0xFFFFFFFF
        _update_flags(reg[rn])

    elif opcode == NOT:
        reg[rn] = (~reg[rn]) & 0xFFFFFFFF
        _update_flags(reg[rn])

    elif opcode == JMP:
        pc = imm

    elif opcode == JZ:
        if zero_flag:
            pc = imm

    elif opcode == JNZ:
        if not zero_flag:
            pc = imm

    elif opcode == JG:
        # Pula se A > B (unsigned)
        if reg['A'] > reg['B']:
            pc = imm

    elif opcode == HALT:
        return False

    elif opcode == ADDI:
        reg[rn] = (reg[rn] + imm) & 0xFFFFFFFF
        _update_flags(reg[rn])

    elif opcode == SUBI:
        reg[rn] = (reg[rn] - imm) & 0xFFFFFFFF
        _update_flags(reg[rn])

    elif opcode == MOV:
        src = _get_reg_name(imm & 0x0F)
        reg[rn] = reg[src]
        _update_flags(reg[rn])

    elif opcode == CMP:
        val = memory.read_word(imm)
        result = (reg[rn] - val) & 0xFFFFFFFF
        _update_flags(result)

    elif opcode == MODI:
        if imm != 0:
            reg[rn] = (reg[rn] % imm) & 0xFFFFFFFF
        _update_flags(reg[rn])

    elif opcode == MOD:
        divisor = memory.read_word(imm)
        if divisor != 0:
            reg[rn] = (reg[rn] % divisor) & 0xFFFFFFFF
        _update_flags(reg[rn])

    return True

def reset():
    """Reseta o processador."""
    global pc, zero_flag, sign_flag
    reg['A'] = 0
    reg['B'] = 0
    pc = 4
    zero_flag = False
    sign_flag = False
