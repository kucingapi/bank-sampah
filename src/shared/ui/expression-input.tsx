import { useState, useCallback, useEffect, useRef } from "react"
import { Input } from "@/shared/ui/ui/input"
import { cn } from "@/shared/lib/utils"

interface ExpressionInputProps {
  value: string | number
  onChange: (value: string) => void
  onNext?: () => void
  onArrowKey?: (direction: 'up' | 'down' | 'left' | 'right') => void
  placeholder?: string
  className?: string
  disabled?: boolean
  min?: string
  step?: string
  inputRef?: ((el: HTMLInputElement | null) => void) | React.MutableRefObject<HTMLInputElement | null> | null
}

/**
 * Safely evaluates a basic arithmetic expression string (e.g. "1 + 2 * 3").
 * Only allows numbers, decimal points, whitespace, and + - * / operators.
 * Returns the result as a string, or the original string if invalid.
 */
function evaluateExpression(expr: string): string {
  const trimmed = expr.trim()
  if (!trimmed) return ""

  // Check if it's already a plain number — no evaluation needed
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return trimmed

  // Validate: only allow digits, decimal points, whitespace, + - * /
  if (!/^[\d\s.+*/-]+$/.test(trimmed)) return trimmed

  try {
    // Tokenize and evaluate safely (no eval of arbitrary code)
    const tokens = trimmed.match(/\d+\.?\d*/g)
    const operators = trimmed.match(/[+\-*/]/g)

    if (!tokens || tokens.length === 0) return trimmed
    if (!operators || operators.length !== tokens.length - 1) return trimmed

    // Parse numbers
    const nums = tokens.map(Number)
    if (nums.some(isNaN)) return trimmed

    // First pass: handle * and /
    const values: number[] = [nums[0]]
    const ops: string[] = []

    for (let i = 0; i < operators.length; i++) {
      const op = operators[i]
      if (op === "*" || op === "/") {
        const left = values.pop()!
        const right = nums[i + 1]
        if (op === "/" && right === 0) return trimmed
        values.push(op === "*" ? left * right : left / right)
      } else {
        ops.push(op)
        values.push(nums[i + 1])
      }
    }

    // Second pass: handle + and -
    let result = values[0]
    for (let i = 0; i < ops.length; i++) {
      result = ops[i] === "+" ? result + values[i + 1] : result - values[i + 1]
    }

    // Format: remove trailing zeros for decimals
    return Number.isInteger(result) ? String(result) : parseFloat(result.toFixed(6)).toString()
  } catch {
    return trimmed
  }
}

export function ExpressionInput({
  value,
  onChange,
  onNext,
  onArrowKey,
  placeholder,
  className,
  disabled,
  min,
  step,
  inputRef,
}: ExpressionInputProps) {
  const [displayValue, setDisplayValue] = useState(String(value))
  const [hasExpression, setHasExpression] = useState(false)
  const localRef = useRef<HTMLInputElement | null>(null)

  // Merge inputRef with localRef
  const setRef = useCallback(
    (el: HTMLInputElement | null) => {
      localRef.current = el
      if (typeof inputRef === "function") {
        inputRef(el)
      } else if (inputRef) {
        inputRef.current = el
      }
    },
    [inputRef]
  )

  useEffect(() => {
    // Sync external value changes
    const str = String(value)
    setDisplayValue(str)
    setHasExpression(false)
  }, [value])

  const commitExpression = useCallback(() => {
    if (hasExpression && displayValue) {
      const evaluated = evaluateExpression(displayValue)
      if (evaluated !== displayValue) {
        setDisplayValue(evaluated)
        onChange(evaluated)
        setHasExpression(false)
      }
    }
  }, [hasExpression, displayValue, onChange])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      commitExpression()
      // Defer onNext to next tick so the value update propagates first
      if (onNext) {
        setTimeout(() => onNext(), 0)
      }
    } else if (onArrowKey && (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "ArrowLeft" || e.key === "ArrowRight")) {
      e.preventDefault()
      const direction = e.key.replace("Arrow", "").toLowerCase() as 'up' | 'down' | 'left' | 'right'
      onArrowKey(direction)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    setDisplayValue(raw)
    // Detect if user is typing an expression (contains operators)
    setHasExpression(/[+\-*/]/.test(raw) && /\d/.test(raw))
    onChange(raw)
  }

  const handleBlur = () => {
    commitExpression()
  }

  return (
    <div className="relative">
      <Input
        ref={setRef}
        type="text"
        min={min}
        step={step}
        placeholder={placeholder}
        className={cn(
          "h-11 pr-10 tabular-nums font-medium rounded-lg transition-all",
          hasExpression && "ring-2 ring-amber-300/40 border-amber-300/50",
          className
        )}
        value={displayValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        disabled={disabled}
      />
      {hasExpression && (
        <span className="absolute right-10 top-1/2 -translate-y-1/2 text-[10px] text-amber-600 dark:text-amber-400 font-medium pointer-events-none">
          ⏎
        </span>
      )}
    </div>
  )
}
