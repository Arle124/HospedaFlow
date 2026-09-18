package domain

import "errors"

// Definición de errores compartidos del dominio para HospedaSync.
var (
	ErrNotFound            = errors.New("recurso no encontrado")
	ErrInvalidInput        = errors.New("los datos suministrados son inválidos")
	ErrShiftAlreadyOpen    = errors.New("el usuario ya tiene un turno abierto")
	ErrShiftAlreadyClosed  = errors.New("el turno ya ha sido cerrado")
	ErrShiftNotActive      = errors.New("el turno no se encuentra activo")
	ErrNegativeAmount      = errors.New("el monto no puede ser negativo")
	ErrInsufficientStock   = errors.New("stock insuficiente para completar la operación")
	ErrUnauthorizedAction  = errors.New("acción no autorizada en el estado actual")
)
