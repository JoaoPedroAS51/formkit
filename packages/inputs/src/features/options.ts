import { FormKitNode } from '@formkit/core'
import { eq, isPojo } from '@formkit/utils'

/**
 * Options should always be formatted as an array of objects with label and value
 * properties.
 * @public
 */
export type FormKitOptionsList = Array<
  {
    label: string
    value: unknown
    __original?: any
  } & { [index: string]: any }
>

/**
 * Options to be normalized
 */
type FormKitOptionsToBeNormalized = string[] | FormKitOptionsList | { [value: string]: string }

/**
 * Accepts an array of objects, array of strings, an object of key-value pairs,
 * or a function that returns any of those items or a Promise that resolves to them.
 * Returns an array of objects with value and label properties.
 * If the return value is a function that returns a promise, we are reassigning the function
 * to the loadOptions prop. If the function returns anything other than promise,
 * then we are going to call normalizeOptions on the given value.
 * @param options -
 * @param node -
 */
function normalizeOptions(
  options: FormKitOptionsToBeNormalized | (() => FormKitOptionsToBeNormalized),
  node: FormKitNode
): FormKitOptionsList {
  let i = 1
  if (Array.isArray(options)) {
    return options.map((option) => {
      if (typeof option === 'string' || typeof option === 'number') {
        return {
          label: option,
          value: option,
        }
      }
      if (typeof option == 'object') {
        if ('value' in option && typeof option.value !== 'string') {
          Object.assign(option, {
            value: `__mask_${i++}`,
            __original: option.value,
          })
        }
      }
      return option
    })
  } else if (typeof options === 'function') {
    if (options() instanceof Promise) {
      node.props.optionsLoader = options
    } else if (!(options() instanceof Promise)) {
      return normalizeOptions(options(), node)
    }
    return []
  }
  return Object.keys(options).map((value) => {
    return {
      label: options[value],
      value,
    }
  })
}

/**
 * Given an option list, find the "true" value in the options.
 * @param options - The options to check for a given value
 * @param value - The value to return
 * @returns
 */
export function optionValue(
  options: FormKitOptionsList,
  value: string
): unknown {
  if (Array.isArray(options)) {
    for (const option of options) {
      if (value == option.value) {
        return '__original' in option ? option.__original : option.value
      }
    }
  }
  return value
}

/**
 * Determines if the value should be selected.
 * @param valueA - Any type of value
 * @param valueB - Any type of value
 */
export function shouldSelect(valueA: unknown, valueB: unknown): boolean {
  if (valueA == valueB) return true
  if (isPojo(valueA) && isPojo(valueB)) return eq(valueA, valueB)
  return false
}

/**
 * Converts the options prop to usable values.
 * @param node - A formkit node.
 * @public
 */
export default function options(node: FormKitNode): void {
  node.hook.prop((prop, next) => {
    if (prop.prop === 'options') {
      const options = normalizeOptions(prop.value, node)
      prop.value = options
    }
    return next(prop)
  })
}
