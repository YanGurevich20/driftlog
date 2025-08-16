import {
	add,
	eachMonthOfInterval,
	endOfYear,
	format,
	isSameMonth,
	parse,
	startOfMonth,
	startOfToday,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import * as React from 'react';
import { cn } from '../../lib/utils';
import { buttonVariants } from './button';

function getStartOfCurrentMonth() {
	return startOfMonth(startOfToday());
}

interface MonthPickerProps {
	currentMonth: Date | null;
	onMonthChange: (newMonth: Date) => void;
}

export function MonthPicker({ currentMonth, onMonthChange }: MonthPickerProps) {
	const [currentYear, setCurrentYear] = React.useState(
		currentMonth ? format(currentMonth, 'yyyy') : format(new Date(), 'yyyy'),
	);
	const firstDayCurrentYear = parse(currentYear, 'yyyy', new Date());

	const months = eachMonthOfInterval({
		start: firstDayCurrentYear,
		end: endOfYear(firstDayCurrentYear),
	});

	function previousYear() {
		const firstDayNextYear = add(firstDayCurrentYear, { years: -1 });
		setCurrentYear(format(firstDayNextYear, 'yyyy'));
	}

	function nextYear() {
		const firstDayNextYear = add(firstDayCurrentYear, { years: 1 });
		setCurrentYear(format(firstDayNextYear, 'yyyy'));
	}

	return (
		<div className="p-3">
			<div className="flex flex-col space-y-4 sm:flex-row sm:space-x-4 sm:space-y-0">
				<div className="space-y-4">
					<div className="relative flex items-center justify-center pt-1">
						<div
							className="text-sm font-medium"
							aria-live="polite"
							role="presentation"
							id="month-picker"
						>
							{format(firstDayCurrentYear, 'yyyy')}
						</div>
						<div className="flex items-center space-x-1">
							<button
								name="previous-year"
								aria-label="Go to previous year"
								className={cn(
									buttonVariants({ variant: 'ghost' }),
									'h-7 w-7 p-0 opacity-50 hover:opacity-100',
									'absolute left-1',
								)}
								type="button"
								onClick={previousYear}
							>
								<ChevronLeft className="h-4 w-4" />
							</button>
							<button
								name="next-year"
								aria-label="Go to next year"
								className={cn(
									buttonVariants({ variant: 'ghost' }),
									'h-7 w-7 p-0 opacity-50 hover:opacity-100',
									'absolute right-1',
								)}
								type="button"
								onClick={nextYear}
							>
								<ChevronRight className="h-4 w-4" />
							</button>
						</div>
					</div>
					<div
						className="grid w-full grid-cols-3 gap-2"
						role="grid"
						aria-labelledby="month-picker"
					>
						{months.map((month) => (
							<div
								key={month.toString()}
								className="relative p-0 text-center text-sm focus-within:relative focus-within:z-20"
								role="presentation"
							>
								<button
									name="day"
									className={cn(
										'inline-flex h-9 w-16 items-center justify-center rounded-md p-0 text-sm font-normal ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 aria-selected:opacity-100',
										currentMonth && isSameMonth(month, currentMonth) ?
											'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground' :
											isSameMonth(month, getStartOfCurrentMonth()) ?
												'bg-muted text-muted-foreground' : '',
									)}
									// Allow selecting future months
									role="gridcell"
									tabIndex={-1}
									type="button"
									onClick={() => onMonthChange(month)}
								>
									<time dateTime={format(month, 'yyyy-MM-dd')}>
										{format(month, 'MMM')}
									</time>
								</button>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
