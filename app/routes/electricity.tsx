import { useFetcher, data } from 'react-router';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import * as React from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Loader, Pencil } from 'lucide-react';
import { cn } from '~/lib/utils';
import * as schema from '~/database/schema';

import { Button } from '~/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '~/components/ui/form';
import { Input } from '~/components/ui/input';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '~/components/ui/popover';
import { Calendar } from '~/components/ui/calendar';

import type { Route } from './+types/electricity';
import { toast } from 'sonner';

export function meta({}: Route.MetaArgs) {
  return [
    { title: '电费记录 - React Router App' },
    { name: 'description', content: '记录每日用电量' },
  ];
}

const formSchema = z.object({
  date: z
    .string()
    .min(1, {
      message: '请选择日期',
    })
    .regex(/^\d{4}-\d{2}-\d{2}$/, {
      message: '日期格式不正确，应为 YYYY-MM-DD',
    }),
  electricity: z
    .string()
    .min(1, {
      message: '请输入电量',
    })
    .regex(/^\d+(\.\d{1,2})?$/, {
      message: '请输入有效的数字，最多支持两位小数',
    }),
  diff: z.string().optional(),
  id: z.number().optional(),
});

export async function action({ request, context }: Route.ActionArgs) {
  const formData = await request.formData();
  const date = formData.get('date')?.toString().trim();
  const electricity = formData.get('electricity')?.toString().trim();
  const diff = formData.get('diff')?.toString().trim() || 0;
  const id = formData.get('id')?.toString().trim();

  if (id) {
    // 更新数据库
    await context.db
      .update(schema.dailyElectricityTable)
      .set({
        date: date ?? '',
        electricity: Number(electricity),
        diff: Number(diff),
      })
      .where(eq(schema.dailyElectricityTable.id, Number(id)));

    return data({ message: '更新成功', success: true }, { status: 200 });
  } else {
    // 查询数据库中是否存在该日期
    const existing = await context.db.query.dailyElectricityTable.findFirst({
      where: eq(schema.dailyElectricityTable.date, date ?? ''),
    });

    console.log('existing', existing);

    if (existing) {
      return data({ message: '该日期已存在', success: false }, { status: 400 });
    }

    try {
      await context.db.insert(schema.dailyElectricityTable).values({
        date: date ?? '',
        electricity: Number(electricity),
        diff: Number(diff),
      });
    } catch (error) {
      return data({ message: '插入失败', success: false }, { status: 400 });
    }
  }
}

export async function loader({ context }: Route.LoaderArgs) {
  const list = await context.db.query.dailyElectricityTable.findMany({
    columns: {
      id: true,
      date: true,
      electricity: true,
      diff: true,
    },
  });

  return {
    list,
  };
}

export default function Home({ actionData, loaderData }: Route.ComponentProps) {
  const fetcher = useFetcher();
  const [open, setOpen] = React.useState(false);
  const [editId, setEditId] = React.useState<number | null>(null);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: '',
      electricity: '',
    },
  });

  // 添加 useEffect 监听 fetcher 状态变化
  React.useEffect(() => {
    if (fetcher.state === 'idle') {
      if (fetcher.data) {
        if (fetcher.data.success) {
          toast.success(fetcher.data.message);
          form.reset(); // 成功后重置表单
          setOpen(false); // 关闭对话框
        } else {
          toast.error(fetcher.data.message);
        }
      }
    }
  }, [fetcher.data, fetcher.state]);

  const handleSubmit = (data: z.infer<typeof formSchema>) => {
    if (editId) {
      data.id = editId;
    }
    fetcher.submit(data, {
      method: 'post',
    });
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">电费记录</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <CalendarIcon className="mr-2 h-4 w-4" />
              新增记录
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>新增每日用电量</DialogTitle>
              <DialogDescription>请选择日期并输入电量数据</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleSubmit)}
                className="space-y-6"
              >
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>日期</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={'outline'}
                              className={cn(
                                'w-full pl-3 text-left font-normal',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              {field.value ? (
                                format(new Date(field.value), 'yyyy-MM-dd')
                              ) : (
                                <span>选择日期</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={
                              field.value ? new Date(field.value) : undefined
                            }
                            onSelect={(date) =>
                              field.onChange(
                                date ? format(date, 'yyyy-MM-dd') : ''
                              )
                            }
                            disabled={(date) =>
                              date > new Date() || date < new Date('2024-01-01')
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormDescription>选择需要记录的日期</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="electricity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>电量</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="请输入电量数值"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        输入当日电表读数，支持两位小数
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="diff"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>差值</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="请输入差值数值"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        输入上日与当日电表读数差值，支持两位小数
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit">
                    {fetcher.state === 'submitting' ? (
                      <>
                        <Loader className="mr-2 h-4 w-4 animate-spin" />
                        提交中...
                      </>
                    ) : (
                      '提交'
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableCaption>电费使用记录表</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">ID</TableHead>
              <TableHead>日期</TableHead>
              <TableHead>电量 (度)</TableHead>
              <TableHead>差值</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loaderData.list.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.id}</TableCell>
                <TableCell>{item.date}</TableCell>
                <TableCell>{item.electricity}</TableCell>
                <TableCell>{item.diff || '-'}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant={'outline'}
                    size={'icon'}
                    onClick={() => {
                      setOpen(true);
                      form.setValue('date', item.date);
                      form.setValue('electricity', item.electricity.toString());
                      form.setValue('diff', item.diff || 0);
                      setEditId(item.id);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
