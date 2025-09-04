import { Data, Effect } from 'effect'
import {
  div,
  h1,
  h2,
  h3,
  p,
  label,
  input,
  select,
  option,
  button,
  a,
  span,
  Html,
  Class,
  Href,
  Value,
  OnChange,
  OnClick,
  Type,
  For,
  Min,
} from '@foldkit/html'
import { AppSettings } from '../types/Note'
import { buildNotesListUrl } from '../routing'

// MODEL
export type Model = {
  readonly settings: AppSettings
  readonly isDirty: boolean
  readonly isSaving: boolean
}

export const initModel = (settings: AppSettings): Model => ({
  settings,
  isDirty: false,
  isSaving: false,
})

// MESSAGES
export type Message = Data.TaggedEnum<{
  ThemeChanged: { theme: 'light' | 'dark' | 'auto' }
  FontSizeChanged: { fontSize: number }
  LineSpacingChanged: { lineSpacing: number }
  Save: {}
  SaveCompleted: {}
  Reset: {}
  ExportData: {}
}>

export const Message = Data.taggedEnum<Message>()

// UPDATE
export const update = (message: Message) => (model: Model): [Model, Effect.Effect<void>] => {
  return Message.$match(message, {
    ThemeChanged: ({ theme }) => [
      { ...model, settings: { ...model.settings, theme }, isDirty: true },
      Effect.void
    ],
    
    FontSizeChanged: ({ fontSize }) => [
      { ...model, settings: { ...model.settings, fontSize }, isDirty: true },
      Effect.void
    ],
    
    LineSpacingChanged: ({ lineSpacing }) => [
      { ...model, settings: { ...model.settings, lineSpacing }, isDirty: true },
      Effect.void
    ],
    
    Save: () => [
      { ...model, isSaving: true },
      Effect.void // In real app, this would save settings
    ],
    
    SaveCompleted: () => [
      { ...model, isSaving: false, isDirty: false },
      Effect.void
    ],
    
    Reset: () => [
      { 
        ...model, 
        settings: { theme: 'auto', fontSize: 14, lineSpacing: 1.5 }, 
        isDirty: true 
      },
      Effect.void
    ],
    
    ExportData: () => [
      model,
      Effect.void // In real app, this would trigger data export
    ],
  })
}

// VIEW HELPERS
const settingCard = (title: string, description: string, children: Html[]) =>
  div(
    [Class('bg-white rounded-xl shadow-sm border border-gray-200 p-6')],
    [
      div([Class('mb-4')], [
        h3([Class('text-lg font-semibold text-gray-900 mb-1')], [title]),
        p([Class('text-sm text-gray-600')], [description])
      ]),
      ...children
    ]
  )

const themeSelector = (currentTheme: 'light' | 'dark' | 'auto') =>
  div([Class('grid grid-cols-3 gap-3')], [
    ['light', '☀️', 'Light'],
    ['dark', '🌙', 'Dark'], 
    ['auto', '🔄', 'Auto']
  ].map(([value, icon, label]) =>
    button([
      OnClick(Message.ThemeChanged({ theme: value as any })),
      Class(`flex flex-col items-center p-4 rounded-lg border-2 transition-all ${
        currentTheme === value 
          ? 'border-blue-500 bg-blue-50 text-blue-700' 
          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
      }`)
    ], [
      span([Class('text-2xl mb-2')], [icon]),
      span([Class('text-sm font-medium')], [label])
    ])
  ))

const sliderSetting = (
  id: string,
  label: string,
  value: number,
  min: number,
  max: number,
  step: number,
  unit: string,
  onChange: (value: number) => Message
) =>
  div([Class('space-y-3')], [
    div([Class('flex justify-between items-center')], [
      label([
        For(id),
        Class('text-sm font-medium text-gray-700')
      ], [label]),
      span([Class('text-sm text-gray-600')], [`${value}${unit}`])
    ]),
    
    input([
      Type('range'),
      Min(min.toString()),
      Max(max.toString()),
      Step(step.toString()),
      Value(value.toString()),
      OnInput((val) => onChange(parseFloat(val))),
      Class(`w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer
             slider-thumb:appearance-none slider-thumb:w-4 slider-thumb:h-4 
             slider-thumb:rounded-full slider-thumb:bg-blue-600 slider-thumb:cursor-pointer`)
    ])
  ])

const actionButton = (
  text: string,
  onClick: Message,
  variant: 'primary' | 'secondary' | 'danger' = 'secondary'
) => {
  const baseClasses = 'px-4 py-2 font-medium rounded-lg transition-colors'
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
    danger: 'bg-red-100 text-red-700 hover:bg-red-200'
  }
  
  return button([
    OnClick(onClick),
    Class(`${baseClasses} ${variantClasses[variant]}`)
  ], [text])
}

// MAIN VIEW
export const view = (model: Model): Html => {
  return div(
    [Class('min-h-screen bg-gray-50')],
    [
      // Header
      div(
        [Class('bg-white shadow-sm border-b border-gray-100')],
        [
          div(
            [Class('max-w-4xl mx-auto px-6 py-6')],
            [
              div([Class('flex items-center justify-between')], [
                div([Class('flex items-center space-x-4')], [
                  a([
                    Href(buildNotesListUrl()),
                    Class('text-gray-600 hover:text-gray-800 transition-colors')
                  ], ['← Back']),
                  h1([Class('text-3xl font-bold text-gray-900')], ['Settings'])
                ]),
                
                div([Class('flex items-center space-x-3')], [
                  ...(model.isDirty ? [
                    span([Class('text-sm text-amber-600')], ['Unsaved changes']),
                    button([
                      OnClick(Message.Save()),
                      Class(`px-4 py-2 bg-blue-600 text-white font-medium rounded-lg 
                             hover:bg-blue-700 transition-colors ${
                               model.isSaving ? 'opacity-50' : ''
                             }`)
                    ], [model.isSaving ? 'Saving...' : 'Save'])
                  ] : [])
                ])
              ])
            ]
          )
        ]
      ),
      
      // Content
      div(
        [Class('max-w-4xl mx-auto px-6 py-8')],
        [
          div([Class('space-y-8')], [
            // Appearance settings
            settingCard(
              'Appearance',
              'Customize how the app looks and feels',
              [
                div([Class('space-y-6')], [
                  div([], [
                    h4([Class('text-sm font-medium text-gray-700 mb-3')], ['Theme']),
                    themeSelector(model.settings.theme)
                  ]),
                  
                  sliderSetting(
                    'fontSize',
                    'Font Size',
                    model.settings.fontSize,
                    10,
                    20,
                    1,
                    'px',
                    (fontSize) => Message.FontSizeChanged({ fontSize })
                  ),
                  
                  sliderSetting(
                    'lineSpacing',
                    'Line Spacing',
                    model.settings.lineSpacing,
                    1.0,
                    2.5,
                    0.1,
                    '',
                    (lineSpacing) => Message.LineSpacingChanged({ lineSpacing })
                  ),
                ])
              ]
            ),
            
            // Data settings
            settingCard(
              'Data Management',
              'Export or reset your data',
              [
                div([Class('space-y-4')], [
                  div([Class('flex items-center justify-between p-4 bg-gray-50 rounded-lg')], [
                    div([], [
                      h4([Class('font-medium text-gray-900')], ['Export Data']),
                      p([Class('text-sm text-gray-600')], ['Download all your notes and tags as JSON'])
                    ]),
                    actionButton('Export', Message.ExportData())
                  ]),
                  
                  div([Class('flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200')], [
                    div([], [
                      h4([Class('font-medium text-red-900')], ['Reset Settings']),
                      p([Class('text-sm text-red-600')], ['Restore all settings to their default values'])
                    ]),
                    actionButton('Reset', Message.Reset(), 'danger')
                  ])
                ])
              ]
            ),
            
            // About section
            settingCard(
              'About',
              'Information about this notes app',
              [
                div([Class('space-y-3 text-sm text-gray-600')], [
                  div([Class('flex justify-between')], [
                    span([], ['Version']),
                    span([Class('font-medium')], ['1.0.0'])
                  ]),
                  div([Class('flex justify-between')], [
                    span([], ['Built with']),
                    span([Class('font-medium')], ['Effect + FoldKit'])
                  ]),
                  div([Class('flex justify-between')], [
                    span([], ['Last updated']),
                    span([Class('font-medium')], ['Just now'])
                  ])
                ])
              ]
            )
          ])
        ]
      )
    ]
  )
}