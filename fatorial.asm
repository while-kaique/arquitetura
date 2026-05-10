; Problema 4: Fatorial
; Entrada: mem[2] = N
; Saida:   mem[1] = N!
; Auxiliares: mem[100] = resultado, mem[101] = contador
LOADI A, 1
STORE A, 100
LOAD A, 2
STORE A, 101
LOOP:
LOAD A, 101
JZ FIM
LOAD A, 100
MUL A, 101
STORE A, 100
LOAD A, 101
SUBI A, 1
STORE A, 101
JMP LOOP
FIM:
LOAD A, 100
STORE A, 1
HALT
