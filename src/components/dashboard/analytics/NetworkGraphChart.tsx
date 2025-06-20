
"use client";

import React from 'react';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, Legend, Cell } from 'recharts';
import type { TooltipProps } from 'recharts';
import { Card, CardContent } from '@/components/ui/card';

export interface NetworkNode {
  id: string;
  name: string;
  category: string;
  value: number; // For ZAxis sizing (e.g., total_purchase_count)
  x: number;
  y: number;
  color: string;
}

export interface NetworkLink {
  target: string; // Target node name
  count: number; // Co-purchase count
}
export type NetworkLinkMap = Map<string, NetworkLink[]>;


interface NetworkGraphChartProps {
  nodes: NetworkNode[];
  linksMap: NetworkLinkMap;
}

const CustomNodeTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as NetworkNode;
    // The 'linksMap' is passed as part of the node data itself in `nodesWithLinks`
    const links = (payload[0] as any).linksMap?.get(data.name) || [];
    
    // Sort links by count descending and take top 5
    const topLinks = links
        .sort((a: NetworkLink, b: NetworkLink) => b.count - a.count)
        .slice(0, 5);

    return (
      <Card className="w-64 shadow-xl">
        <CardContent className="p-3">
          <p className="text-sm font-bold text-primary">{data.name}</p>
          <p className="text-xs text-muted-foreground">Category: {data.category}</p>
          <p className="text-xs text-muted-foreground">Total Purchases: {data.value}</p>
          {topLinks.length > 0 && (
            <>
              <hr className="my-2" />
              <p className="text-xs font-semibold mb-1">Often Bought With:</p>
              <ul className="list-disc list-inside text-xs space-y-0.5">
                {topLinks.map((link: NetworkLink, index: number) => (
                  <li key={index} className="text-muted-foreground">
                    {link.target} ({link.count} times)
                  </li>
                ))}
              </ul>
            </>
          )}
        </CardContent>
      </Card>
    );
  }
  return null;
};


export function NetworkGraphChart({ nodes, linksMap }: NetworkGraphChartProps) {
  if (!nodes || nodes.length === 0) {
    return <p className="text-muted-foreground text-center py-10">No data to display network graph.</p>;
  }
  
  // Pass linksMap to each node for tooltip access
  const nodesWithLinks = nodes.map(node => ({ ...node, linksMap }));

  return (
    <ResponsiveContainer width="100%" height={400}>
      <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
        <XAxis type="number" dataKey="x" tick={false} axisLine={false} tickLine={false} domain={['dataMin - 50', 'dataMax + 50']} />
        <YAxis type="number" dataKey="y" tick={false} axisLine={false} tickLine={false} domain={['dataMin - 50', 'dataMax + 50']} />
        <ZAxis type="number" dataKey="value" range={[100, 1200]} name="Total Purchases" unit="" />
        
        <Tooltip content={<CustomNodeTooltip />} cursor={{ strokeDasharray: '3 3' }}/>
        
        <Scatter name="Food Items" data={nodesWithLinks} shape="circle">
          {nodesWithLinks.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Scatter>
        {/* Legend for categories can be added if needed, but might clutter. Colors are distinct. */}
      </ScatterChart>
    </ResponsiveContainer>
  );
}
