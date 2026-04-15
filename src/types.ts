export type KidId = 'yuvali' | 'maayani' | 'palgi';

export interface Task {
  id: string;
  title: string;
  iconOff: string;
  iconOn: string;
  side: 'left' | 'right';
}

export interface KidConfig {
  id: KidId;
  name: string;
  profileImg: string;
  gradient: string;
  outlineColor: string;
}
