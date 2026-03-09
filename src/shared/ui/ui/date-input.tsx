'use client'

import { useState, useEffect, type FC, type InputHTMLAttributes } from 'react'
import { cn } from '@/shared/lib/utils'

export interface DateInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value?: Date
  onChange?: (date: Date) => void
}

const formatDateForInput = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const parseInputToDate = (value: string): Date => {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export const DateInput: FC<DateInputProps> = ({
  value,
  onChange,
  className,
  ...props
}) => {
  const [inputValue, setInputValue] = useState('')

  useEffect(() => {
    if (value) {
      setInputValue(formatDateForInput(value))
    }
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)

    if (newValue && onChange) {
      try {
        const date = parseInputToDate(newValue)
        if (!isNaN(date.getTime())) {
          onChange(date)
        }
      } catch {
        // Invalid date format, ignore
      }
    }
  }

  return (
    <input
      type="date"
      value={inputValue}
      onChange={handleChange}
      className={cn(
        'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
}
