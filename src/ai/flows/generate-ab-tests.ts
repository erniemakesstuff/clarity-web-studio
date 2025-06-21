
'use server';
/**
 * @fileOverview AI flow for generating A/B test hypotheses for a menu.
 *
 * - generateAbTests - A function that generates A/B test hypotheses.
 * - GenerateAbTestsInput - The input type for the generateAbTests function.
 * - GenerateAbTestsOutput - The return type for the generateAbTests function.
 * - AbTestHypothesis - The structure for an individual A/B test hypothesis.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AbTestHypothesisSchema = z.object({
  id: z.string().describe('A unique ID for the test (e.g., "TEST001").'),
  changeDescription: z.string().describe('A concise description of the proposed A/B test change (e.g., "Promote Garlic Bread with all Pasta Dishes").'),
  reasoning: z.string().describe("The AI's reasoning or justification for why this test might be effective in increasing upsells or order value."),
});
export type AbTestHypothesis = z.infer<typeof AbTestHypothesisSchema>;

const GenerateAbTestsInputSchema = z.object({
  currentMenuSummary: z.string().describe('A summary of the current menu items, categories, and prices.'),
  testGoal: z
    .string()
    .optional()
    .describe('Optional goal or specific instructions from the administrator to guide A/B test generation (e.g., "focus on high-margin items", "promote new seasonal dishes").'),
});
export type GenerateAbTestsInput = z.infer<typeof GenerateAbTestsInputSchema>;

const GenerateAbTestsOutputSchema = z.object({
  hypotheses: z.array(AbTestHypothesisSchema).describe('A list of 2-3 A/B test hypotheses with unique IDs, descriptions of changes, and AI reasoning.'),
});
export type GenerateAbTestsOutput = z.infer<typeof GenerateAbTestsOutputSchema>;

export async function generateAbTests(input: GenerateAbTestsInput): Promise<GenerateAbTestsOutput> {
  return generateAbTestsFlow(input);
}

const generateAbTestsPrompt = ai.definePrompt({
  name: 'generateAbTestsPrompt',
  input: {schema: GenerateAbTestsInputSchema},
  output: {schema: GenerateAbTestsOutputSchema},
  prompt: `You are an AI assistant specialized in menu optimization. Your goal is to generate A/B test hypotheses to help achieve a business goal, which ultimately increases upsells and average order value.

Current Menu Summary:
{{{currentMenuSummary}}}

{{#if testGoal}}
Administrator's Goal/Instructions:
{{{testGoal}}}
{{else}}
No specific goal provided. Use general best practices for upselling and revenue maximization.
{{/if}}

Based on the menu and any provided goal, generate 2-3 distinct A/B test hypotheses.
For each hypothesis, provide:
1.  A unique ID (e.g., "TEST001", "TEST002").
2.  A clear 'changeDescription' of what specific change to test on the menu (e.g., "Suggest 'Side Salad' when a 'Pizza' is added to cart", "Feature 'Wine Pairing of the Week' on the main course section").
3.  Your 'reasoning' explaining why this change is likely to be effective.

Focus on actionable and measurable changes. Ensure the output is an array of hypotheses according to the defined schema.
Example reasoning: "Pairing X with Y is a common customer preference and highlighting it could increase adoption." or "Item Z is a high-margin product, promoting it with popular dishes could boost overall profit."
`,
});

const generateAbTestsFlow = ai.defineFlow(
  {
    name: 'generateAbTestsFlow',
    inputSchema: GenerateAbTestsInputSchema,
    outputSchema: GenerateAbTestsOutputSchema,
  },
  async (input: GenerateAbTestsInput) => {
    const {output} = await generateAbTestsPrompt(input);
    
    if (output && output.hypotheses) {
        output.hypotheses.forEach((hypo, index) => {
            if (!hypo.id || hypo.id.trim() === "") {
                hypo.id = `HYPO-${Date.now()}-${index}`;
            }
        });
        if (output.hypotheses.length === 0) {
          output.hypotheses.push({
            id: "MOCK_EMPTY_001",
            changeDescription: "Example: Offer a discount on appetizers if main course count is > 2.",
            reasoning: "This is a fallback mock suggestion as the AI returned no hypotheses. This could encourage larger group orders."
          });
        }
    } else {
        return { hypotheses: [{
            id: "MOCK_FALLBACK_001",
            changeDescription: "Display a 'Chef's Special' prominently.",
            reasoning: "Highlighting a special can attract attention and drive sales of a potentially high-margin or new item."
        }]};
    }

    return output!;
  }
);
