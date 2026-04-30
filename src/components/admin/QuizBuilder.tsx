import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { HelpCircle, Plus, Trash2, GripVertical, CheckCircle2, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';

export interface CourseQuiz {
    id?: string;
    course_id?: string;
    question: string;
    options: string[];
    correct_index: number;
    explanation: string;
    order_index: number;
    after_lesson_index?: number | null;
    quiz_title?: string | null;
}

interface LessonOption {
    index: number;
    title: string;
}

interface QuizBuilderProps {
    quizzes: CourseQuiz[];
    onChange: (quizzes: CourseQuiz[]) => void;
    lessons?: LessonOption[];
}

export function QuizBuilder({ quizzes, onChange, lessons = [] }: QuizBuilderProps) {
    const [expandedId, setExpandedId] = useState<number | null>(null);

    const handleAddQuiz = (afterLessonIndex?: number | null) => {
        const newQuiz: CourseQuiz = {
            question: '',
            options: ['', ''],
            correct_index: 0,
            explanation: '',
            order_index: quizzes.length,
            after_lesson_index: afterLessonIndex ?? null,
            quiz_title: afterLessonIndex != null ? `Wissenscheck` : null,
        };
        const updated = [...quizzes, newQuiz];
        onChange(updated);
        setExpandedId(updated.length - 1);
    };

    const handleUpdateQuiz = (index: number, updates: Partial<CourseQuiz>) => {
        const newQuizzes = [...quizzes];
        newQuizzes[index] = { ...newQuizzes[index], ...updates };
        onChange(newQuizzes);
    };

    const handleRemoveQuiz = (index: number) => {
        const newQuizzes = quizzes.filter((_, i) => i !== index);
        onChange(newQuizzes.map((q, i) => ({ ...q, order_index: i })));
        if (expandedId === index) setExpandedId(null);
        else if (expandedId !== null && expandedId > index) setExpandedId(expandedId - 1);
    };

    // Group quizzes: inline (with after_lesson_index) and final (null/undefined)
    const inlineQuizzes = quizzes
        .map((q, idx) => ({ quiz: q, originalIndex: idx }))
        .filter(({ quiz }) => quiz.after_lesson_index != null && quiz.after_lesson_index >= 0);
    const finalQuizzes = quizzes
        .map((q, idx) => ({ quiz: q, originalIndex: idx }))
        .filter(({ quiz }) => quiz.after_lesson_index == null || quiz.after_lesson_index < 0);

    return (
        <div className="space-y-6">
            {/* Inline quizzes section */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-base font-semibold flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-chart-4" />
                            Zwischenquizze
                        </h2>
                        <p className="text-xs text-muted-foreground mt-0.5">Fragen zwischen Lektionen einfügen, um das Wissen zwischendurch zu testen.</p>
                    </div>
                    <Button onClick={() => handleAddQuiz(0)} variant="outline" size="sm" className="gap-1.5">
                        <Plus className="h-3.5 w-3.5" />
                        Zwischenfrage
                    </Button>
                </div>

                {inlineQuizzes.length === 0 ? (
                    <div className="border border-dashed border-border/50 rounded-md p-6 text-center">
                        <Sparkles className="h-8 w-8 mx-auto mb-2 text-muted-foreground/20" />
                        <p className="text-sm text-muted-foreground">Noch keine Zwischenfragen.</p>
                        <p className="text-xs text-muted-foreground mt-1">Fügen Sie Fragen hinzu, die nach bestimmten Lektionen erscheinen.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {inlineQuizzes.map(({ quiz, originalIndex }) => (
                            <QuizCard
                                key={originalIndex}
                                quiz={quiz}
                                index={originalIndex}
                                isExpanded={expandedId === originalIndex}
                                onToggle={() => setExpandedId(expandedId === originalIndex ? null : originalIndex)}
                                onUpdate={(updates) => handleUpdateQuiz(originalIndex, updates)}
                                onRemove={() => handleRemoveQuiz(originalIndex)}
                                lessons={lessons}
                                showPlacement
                            />
                        ))}
                    </div>
                )}
            </div>

            <div className="border-t border-border/50" />

            {/* Final exam section */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-base font-semibold flex items-center gap-2">
                            <HelpCircle className="h-4 w-4 text-primary" />
                            Abschlusstest
                        </h2>
                        <p className="text-xs text-muted-foreground mt-0.5">Fragen am Ende des Kurses. Alle müssen korrekt beantwortet werden.</p>
                    </div>
                    <Button onClick={() => handleAddQuiz(null)} size="sm" className="gap-1.5">
                        <Plus className="h-3.5 w-3.5" />
                        Frage hinzufügen
                    </Button>
                </div>

                {finalQuizzes.length === 0 ? (
                    <div className="border border-dashed border-border/50 rounded-md p-6 text-center">
                        <HelpCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground/20" />
                        <p className="text-sm text-muted-foreground">Kein Abschlusstest definiert.</p>
                        <p className="text-xs text-muted-foreground mt-1">Ohne Abschlusstest erhalten Teilnehmer das Zertifikat nach Abschluss aller Lektionen.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {finalQuizzes.map(({ quiz, originalIndex }) => (
                            <QuizCard
                                key={originalIndex}
                                quiz={quiz}
                                index={originalIndex}
                                isExpanded={expandedId === originalIndex}
                                onToggle={() => setExpandedId(expandedId === originalIndex ? null : originalIndex)}
                                onUpdate={(updates) => handleUpdateQuiz(originalIndex, updates)}
                                onRemove={() => handleRemoveQuiz(originalIndex)}
                                lessons={lessons}
                                showPlacement={false}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

interface QuizCardProps {
    quiz: CourseQuiz;
    index: number;
    isExpanded: boolean;
    onToggle: () => void;
    onUpdate: (updates: Partial<CourseQuiz>) => void;
    onRemove: () => void;
    lessons: LessonOption[];
    showPlacement: boolean;
}

function QuizCard({ quiz, index, isExpanded, onToggle, onUpdate, onRemove, lessons, showPlacement }: QuizCardProps) {
    const placementLabel = quiz.after_lesson_index != null && quiz.after_lesson_index >= 0
        ? `Nach Lektion ${quiz.after_lesson_index + 1}`
        : 'Abschlusstest';

    return (
        <Card className={`border-border/50 overflow-hidden transition-shadow ${isExpanded ? 'shadow-md ring-1 ring-primary/20' : 'shadow-sm'}`}>
            {/* Header */}
            <button
                className="w-full flex items-center gap-3 p-3 hover:bg-muted/30 transition-colors text-left"
                onClick={onToggle}
            >
                <div className="flex items-center justify-center h-7 w-7 rounded-md bg-primary/10 text-primary text-xs font-bold flex-shrink-0">
                    {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{quiz.question || 'Neue Frage'}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                        {showPlacement && (
                            <Badge variant="outline" className="text-[10px] h-4 px-1.5 bg-chart-4/10 text-chart-4 border-chart-4/20">
                                {placementLabel}
                            </Badge>
                        )}
                        <span className="text-[10px] text-muted-foreground">{quiz.options.length} Optionen</span>
                    </div>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/60 hover:text-destructive hover:bg-destructive/10 flex-shrink-0" onClick={(e) => { e.stopPropagation(); onRemove(); }}>
                    <Trash2 className="h-3.5 w-3.5" />
                </Button>
                {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
            </button>

            {/* Expanded content */}
            {isExpanded && (
                <CardContent className="px-4 pb-4 pt-0 border-t border-border/50 space-y-4 animate-in slide-in-from-top-1 duration-200">
                    {showPlacement && lessons.length > 0 && (
                        <div className="pt-3 space-y-1.5">
                            <Label className="text-xs">Erscheint nach Lektion</Label>
                            <Select
                                value={String(quiz.after_lesson_index ?? 0)}
                                onValueChange={(v) => onUpdate({ after_lesson_index: parseInt(v) })}
                            >
                                <SelectTrigger className="h-9">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {lessons.map((l) => (
                                        <SelectItem key={l.index} value={String(l.index)}>
                                            Lektion {l.index + 1}: {l.title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <div className="space-y-1.5 pt-3">
                        <Label className="text-xs">Frage</Label>
                        <Input
                            value={quiz.question}
                            onChange={(e) => onUpdate({ question: e.target.value })}
                            placeholder="Geben Sie hier die Frage ein..."
                            className="font-medium"
                        />
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <Label className="text-xs">Antwortmöglichkeiten</Label>
                            <span className="text-[10px] text-chart-2 font-medium flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                Klicken = korrekte Antwort
                            </span>
                        </div>
                        <div className="space-y-2">
                            {quiz.options.map((opt, oIdx) => (
                                <div key={oIdx} className="flex gap-2 items-center group">
                                    <button
                                        className={`flex-shrink-0 h-8 w-8 rounded-md flex items-center justify-center border-2 transition-all ${quiz.correct_index === oIdx
                                            ? 'bg-chart-2/15 border-chart-2 text-chart-2 shadow-sm shadow-chart-2/20'
                                            : 'bg-background border-border text-muted-foreground/40 hover:border-chart-2/50 hover:text-chart-2/50'
                                            }`}
                                        onClick={() => onUpdate({ correct_index: oIdx })}
                                        title="Als korrekte Antwort markieren"
                                    >
                                        <CheckCircle2 className="h-4 w-4" />
                                    </button>
                                    <Input
                                        value={opt}
                                        onChange={(e) => {
                                            const newOpts = [...quiz.options];
                                            newOpts[oIdx] = e.target.value;
                                            onUpdate({ options: newOpts });
                                        }}
                                        placeholder={`Option ${oIdx + 1}`}
                                        className={`transition-colors ${quiz.correct_index === oIdx ? 'border-chart-2/40 focus-visible:ring-chart-2/30' : ''}`}
                                    />
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground/30 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                                        disabled={quiz.options.length <= 2}
                                        onClick={() => {
                                            const newOpts = [...quiz.options];
                                            newOpts.splice(oIdx, 1);
                                            let newCorrect = quiz.correct_index;
                                            if (newCorrect === oIdx) newCorrect = 0;
                                            else if (newCorrect > oIdx) newCorrect--;
                                            onUpdate({ options: newOpts, correct_index: newCorrect });
                                        }}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full text-xs border-dashed h-8"
                            onClick={() => onUpdate({ options: [...quiz.options, ''] })}
                        >
                            + Weitere Option
                        </Button>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs">Erklärung <span className="text-muted-foreground font-normal">(nach Antwort anzeigen)</span></Label>
                        <Textarea
                            value={quiz.explanation || ''}
                            onChange={(e) => onUpdate({ explanation: e.target.value })}
                            placeholder="Warum ist diese Antwort richtig?"
                            rows={2}
                            className="resize-none"
                        />
                    </div>
                </CardContent>
            )}
        </Card>
    );
}
