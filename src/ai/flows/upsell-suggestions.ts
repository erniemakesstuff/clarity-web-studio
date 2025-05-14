// This file is machine-generated - DO NOT EDIT!

'use server';

/**
 * @fileOverview Provides AI-powered upsell suggestions for menu items.
 *
 * - getUpsellSuggestions - A function that returns upsell suggestions for a given menu.
 * - UpsellSuggestionsInput - The input type for the getUpsellSuggestions function.
 * - UpsellSuggestionsOutput - The return type for the getUpsellSuggestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const UpsellSuggestionsInputSchema = z.object({
  menuDescription: z.string().describe('The description of the restaurant menu.'),
  orderedItem: z.string().describe('The name of the item the customer has ordered.'),
});
export type UpsellSuggestionsInput = z.infer<typeof UpsellSuggestionsInputSchema>;

const UpsellSuggestionsOutputSchema = z.object({
  upsellSuggestions: z.array(z.string()).describe('A list of upsell suggestions for the ordered item.'),
});
export type UpsellSuggestionsOutput = z.infer<typeof UpsellSuggestionsOutputSchema>;

export async function getUpsellSuggestions(input: UpsellSuggestionsInput): Promise<UpsellSuggestionsOutput> {
  return upsellSuggestionsFlow(input);
}

const upsellSuggestionsPrompt = ai.definePrompt({
  name: 'upsellSuggestionsPrompt',
  input: {schema: UpsellSuggestionsInputSchema},
  output: {schema: UpsellSuggestionsOutputSchema},
  prompt: `You are a helpful AI assistant that suggests relevant upsell items based on a customer\'s order.

Given the following menu description:
{{{menuDescription}}}

And the customer\'s order of: {{{orderedItem}}}

Suggest some items that would complement their order. Only list items that exist in the menu description.
Return a maximum of 3 suggestions.
`,
});

const upsellSuggestionsFlow = ai.defineFlow(
  {
    name: 'upsellSuggestionsFlow',
    inputSchema: UpsellSuggestionsInputSchema,
    outputSchema: UpsellSuggestionsOutputSchema,
  },
  async input => {
    const {output} = await upsellSuggestionsPrompt(input);
    return output!;
  }
);
