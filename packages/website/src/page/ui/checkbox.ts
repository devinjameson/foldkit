import type { HtmlBuilder } from 'foldkit/html'

import { Checkbox } from '@foldkit/ui'

import {
  type Message,
  ToggledCheckboxAllDemo,
  ToggledCheckboxBasicDemo,
  ToggledCheckboxOptionADemo,
  ToggledCheckboxOptionBDemo,
} from './message'
import type { Model } from './model'

export const CHECKBOX_BASIC_DEMO_ID = 'checkbox-basic-demo'
export const CHECKBOX_ALL_DEMO_ID = 'checkbox-all-demo'
export const CHECKBOX_OPTION_A_DEMO_ID = 'checkbox-option-a-demo'
export const CHECKBOX_OPTION_B_DEMO_ID = 'checkbox-option-b-demo'

// DEMO CONTENT

const wrapperClassName = 'flex flex-col gap-1'

const topRowClassName = 'flex items-center gap-2'

const checkboxClassName =
  'flex h-5 w-5 shrink-0 items-center justify-center rounded border border-gray-400 dark:border-gray-500 cursor-pointer data-[checked]:bg-accent-600 data-[checked]:border-accent-600 data-[indeterminate]:bg-accent-600 data-[indeterminate]:border-accent-600 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50'

const labelClassName =
  'text-sm font-normal text-gray-900 dark:text-white cursor-pointer select-none'

const descriptionClassName = 'text-sm text-gray-500 dark:text-gray-400'

// VIEW

export const basicDemo = (model: Model, h: HtmlBuilder<Message>) => {
  const checkmark = h.span([h.Class('text-white text-xs')], ['✓'])

  return [
    Checkbox.view(
      {
        id: CHECKBOX_BASIC_DEMO_ID,
        isChecked: model.isCheckboxBasicDemoChecked,
        onToggle: isChecked => ToggledCheckboxBasicDemo({ isChecked }),
        toView: attributes =>
          h.div(
            [h.Class(wrapperClassName)],
            [
              h.div(
                [h.Class(topRowClassName)],
                [
                  h.button(
                    [...attributes.checkbox, h.Class(checkboxClassName)],
                    model.isCheckboxBasicDemoChecked ? [checkmark] : [],
                  ),
                  h.label(
                    [...attributes.label, h.Class(labelClassName)],
                    ['Accept terms and conditions'],
                  ),
                ],
              ),
              h.p(
                [...attributes.description, h.Class(descriptionClassName)],
                ['You agree to our Terms of Service and Privacy Policy.'],
              ),
            ],
          ),
      },
      h,
    ),
  ]
}

export const indeterminateDemo = (model: Model, h: HtmlBuilder<Message>) => {
  const checkmark = h.span([h.Class('text-white text-xs')], ['✓'])
  const indeterminateMark = h.span([h.Class('text-white text-xs')], ['—'])

  const isAllChecked =
    model.isCheckboxOptionADemoChecked && model.isCheckboxOptionBDemoChecked
  const isNoneChecked =
    !model.isCheckboxOptionADemoChecked && !model.isCheckboxOptionBDemoChecked
  const isIndeterminate = !isAllChecked && !isNoneChecked

  const resolveSelectAllMark = () => {
    if (isIndeterminate) {
      return [indeterminateMark]
    } else if (isAllChecked) {
      return [checkmark]
    } else {
      return []
    }
  }

  return [
    h.div(
      [h.Class('flex flex-col gap-3')],
      [
        Checkbox.view(
          {
            id: CHECKBOX_ALL_DEMO_ID,
            isChecked: isAllChecked,
            isIndeterminate,
            onToggle: isChecked => ToggledCheckboxAllDemo({ isChecked }),
            toView: attributes =>
              h.div(
                [h.Class(topRowClassName)],
                [
                  h.button(
                    [...attributes.checkbox, h.Class(checkboxClassName)],
                    resolveSelectAllMark(),
                  ),
                  h.label(
                    [...attributes.label, h.Class(labelClassName)],
                    ['All notifications'],
                  ),
                ],
              ),
          },
          h,
        ),
        h.div(
          [h.Class('ml-7 flex flex-col gap-3')],
          [
            Checkbox.view(
              {
                id: CHECKBOX_OPTION_A_DEMO_ID,
                isChecked: model.isCheckboxOptionADemoChecked,
                onToggle: isChecked =>
                  ToggledCheckboxOptionADemo({ isChecked }),
                toView: attributes =>
                  h.div(
                    [h.Class(topRowClassName)],
                    [
                      h.button(
                        [...attributes.checkbox, h.Class(checkboxClassName)],
                        model.isCheckboxOptionADemoChecked ? [checkmark] : [],
                      ),
                      h.label(
                        [...attributes.label, h.Class(labelClassName)],
                        ['Email notifications'],
                      ),
                    ],
                  ),
              },
              h,
            ),
            Checkbox.view(
              {
                id: CHECKBOX_OPTION_B_DEMO_ID,
                isChecked: model.isCheckboxOptionBDemoChecked,
                onToggle: isChecked =>
                  ToggledCheckboxOptionBDemo({ isChecked }),
                toView: attributes =>
                  h.div(
                    [h.Class(topRowClassName)],
                    [
                      h.button(
                        [...attributes.checkbox, h.Class(checkboxClassName)],
                        model.isCheckboxOptionBDemoChecked ? [checkmark] : [],
                      ),
                      h.label(
                        [...attributes.label, h.Class(labelClassName)],
                        ['Push notifications'],
                      ),
                    ],
                  ),
              },
              h,
            ),
          ],
        ),
      ],
    ),
  ]
}
