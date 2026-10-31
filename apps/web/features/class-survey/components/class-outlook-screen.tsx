"use client";

import { useMemo } from "react";
import { formatVnDayMonth, computeClassOutlook } from "@guild/shared/lib";
import type { ClassSurvey } from "@guild/shared/schemas";

import { QueryBoundary } from "@/components/shared/query-boundary";
import { PageHeader } from "@/components/shared/page-header";
import { SectionTitle } from "@/components/shared/section-title";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { combineQueries } from "@/lib/query-group";
import { useClassSurvey } from "../hooks/use-class-survey";
import { BeforeAfterTab } from "./before-after-tab";
import { MemberListTab } from "./member-list-tab";
import { OutlookTiles } from "./outlook-tiles";

const FALLBACK_ERROR = "Không tải được lực lượng lưu phái.";
const NO_SURVEY_DESCRIPTION = "Cơ cấu lưu phái hiện tại của bang. Chưa có đợt khảo sát nào.";

/**
 * The line under the page title: the survey's name and where its deadline stands.
 * @param survey - The survey shown, or null when none has run
 * @returns The sentence
 */
function surveyLine(survey: ClassSurvey | null | undefined): string {
  if (survey === undefined) return "Cơ cấu lưu phái của bang trước và sau bản cập nhật.";
  if (survey === null) return NO_SURVEY_DESCRIPTION;

  const day = formatVnDayMonth(new Date(survey.closesAt));

  return survey.isOpen
    ? `${survey.title} - hạn chót hết ngày ${day}`
    : `${survey.title} - đã đóng ngày ${day}`;
}

/**
 * The "Lực lượng lưu phái" page: the survey's name and deadline, four headline figures, and the
 * guild's line-up before and after the update next to the list of who plans what. With no survey it
 * shows only the current line-up.
 * @returns The page content
 */
export function ClassOutlookScreen() {
  const query = useClassSurvey();
  const state = combineQueries([query], FALLBACK_ERROR);
  const view = query.data;
  const outlook = useMemo(
    () => (view ? computeClassOutlook(view.members) : null),
    [view]
  );

  return (
    <>
      <PageHeader
        banner="classOutlook"
        title="Lực lượng lưu phái"
        description={surveyLine(view?.survey)}
      />
      <QueryBoundary state={state} skeleton={<Skeleton className="h-96 w-full" />}>
        {view && outlook && (
          <div className="flex flex-col gap-4">
            {view.survey && <OutlookTiles members={view.members} outlook={outlook} />}
            <Card>
              <CardHeader>
                <SectionTitle>{view.survey ? "Kết quả" : "Cơ cấu phái hiện tại"}</SectionTitle>
              </CardHeader>
              <CardContent>
                {view.survey ? (
                  <Tabs defaultValue="outlook">
                    <TabsList>
                      <TabsTrigger value="outlook">Trước / sau</TabsTrigger>
                      <TabsTrigger value="members">Danh sách</TabsTrigger>
                    </TabsList>
                    <TabsContent value="outlook" className="pt-4">
                      <BeforeAfterTab rows={outlook.rows} hasSurvey />
                    </TabsContent>
                    <TabsContent value="members" className="pt-4">
                      <MemberListTab members={view.members} />
                    </TabsContent>
                  </Tabs>
                ) : (
                  <BeforeAfterTab rows={outlook.rows} hasSurvey={false} />
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </QueryBoundary>
    </>
  );
}
