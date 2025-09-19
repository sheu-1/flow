declare module 'victory-native' {
  import {
    VictoryAxis as _VictoryAxis,
    VictoryBar as _VictoryBar,
    VictoryChart as _VictoryChart,
    VictoryGroup as _VictoryGroup,
    VictoryLegend as _VictoryLegend,
    VictoryLine as _VictoryLine,
    VictoryTheme as _VictoryTheme,
    VictoryTooltip as _VictoryTooltip,
  } from 'victory';

  export const VictoryAxis: typeof _VictoryAxis;
  export const VictoryBar: typeof _VictoryBar;
  export const VictoryChart: typeof _VictoryChart;
  export const VictoryGroup: typeof _VictoryGroup;
  export const VictoryLegend: typeof _VictoryLegend;
  export const VictoryLine: typeof _VictoryLine;
  export const VictoryTheme: typeof _VictoryTheme;
  export const VictoryTooltip: typeof _VictoryTooltip;
}
