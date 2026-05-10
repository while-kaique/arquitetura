; Problema 3: Multiplicacao
; Entrada: mem[2] = A, mem[3] = B
; Saida:   mem[1] = A * B
LOAD A, 2  ; A = mem[2] (input1)
MUL A, 3   ; A = A * mem[3] (input2)
STORE A, 1 ; mem[1] = resultado
HALT
