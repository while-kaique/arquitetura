; Problema 1: Soma
; Entrada: mem[2] = A, mem[3] = B
; Saida:   mem[1] = A + B
; Os 4 primeiros enderecos (0-3) sao reservados e inseridos pelo assembler
LOAD A, 2  ; A = mem[2] (input1)
ADD A, 3   ; A = A + mem[3] (input2)
STORE A, 1 ; mem[1] = resultado
HALT
