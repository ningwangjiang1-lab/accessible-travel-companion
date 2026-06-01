/**
 * 无障碍出行陪伴平台 — 共享组件库 统一导出
 *
 * 用法：
 * ```typescript
 * import { Button, Card, Badge, Modal } from '@/components';
 * ```
 */

// Button
export {default as Button} from './Button/Button';
export type {ButtonProps, ButtonVariant, ButtonSize} from './Button/Button';

// Card 系列
export {default as Card} from './Card/Card';
export type {CardProps, CardVariant} from './Card/Card';

export {default as QuickAction} from './Card/QuickAction';
export type {QuickActionProps} from './Card/QuickAction';

export {default as RouteCard} from './Card/RouteCard';
export type {RouteCardProps, RouteFeature} from './Card/RouteCard';

export {default as TripCard} from './Card/TripCard';
export type {TripCardProps} from './Card/TripCard';

// Badge
export {default as Badge} from './Badge/Badge';
export type {BadgeProps, BadgeVariant} from './Badge/Badge';

// Tag
export {default as Tag} from './Tag/Tag';
export type {TagProps} from './Tag/Tag';

// Input
export {default as SearchInput} from './Input/SearchInput';
export type {SearchInputProps} from './Input/SearchInput';

export {default as FormInput} from './Input/FormInput';
export type {FormInputProps} from './Input/FormInput';

// Avatar
export {default as Avatar} from './Avatar/Avatar';
export type {AvatarProps, AvatarSize} from './Avatar/Avatar';

// ListItem
export {default as ListItem} from './ListItem/ListItem';
export type {ListItemProps} from './ListItem/ListItem';

// ProgressBar
export {default as ProgressBar} from './ProgressBar/ProgressBar';
export type {ProgressBarProps, ProgressBarVariant} from './ProgressBar/ProgressBar';

// Divider
export {default as Divider} from './Divider/Divider';
export type {DividerProps} from './Divider/Divider';

// ChatBubble
export {default as ChatBubble} from './ChatBubble/ChatBubble';
export type {ChatBubbleProps, ChatBubbleType} from './ChatBubble/ChatBubble';

// ModeIndicator
export {default as ModeIndicator} from './ModeIndicator/ModeIndicator';
export type {ModeIndicatorProps, DisabilityMode} from './ModeIndicator/ModeIndicator';

// TypeSelector
export {default as TypeSelector} from './TypeSelector/TypeSelector';
export type {TypeSelectorProps, TypeOption} from './TypeSelector/TypeSelector';

// Modal
export {default as Modal} from './Modal/Modal';
export type {ModalProps} from './Modal/Modal';
